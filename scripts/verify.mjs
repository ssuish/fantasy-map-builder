import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};

const task = option("--task", "local");
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(task)) {
  throw new Error("--task must be a lowercase kebab-case slug");
}

const requestedPhase = option("--phase", "") ?? "";
const phaseNumber = requestedPhase.replace(/^phase-/, "");
if (requestedPhase && !/^[0-6]$/.test(phaseNumber)) {
  throw new Error("--phase must be one of 0, 1, 2, 3, 4, 5, or 6");
}

const git = (...gitArgs) =>
  execFileSync("git", gitArgs, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }).trim();

const head = git("rev-parse", "HEAD");
const branch = git("branch", "--show-current") || "detached";
const startedAt = new Date().toISOString();
const status = git("status", "--porcelain=v1", "--untracked-files=all");
const diff = git("diff", "--binary");
const stagedDiff = git("diff", "--cached", "--binary");
const isPrivatePath = (path) => {
  const normalized = path.replaceAll("\\", "/");
  const base = normalized.split("/").at(-1) ?? normalized;
  return (base.startsWith(".env") && base !== ".env.example") || /^CREDENTIALS(?:\.|$)/i.test(base);
};
const untracked = git("ls-files", "--others", "--exclude-standard")
  .split("\n")
  .filter(Boolean)
  .map((path) => {
    const stat = statSync(path);
    if (isPrivatePath(path) || !stat.isFile()) return path + ":" + stat.size + ":" + stat.mtimeMs;
    const contentHash = createHash("sha256").update(readFileSync(path)).digest("hex");
    return path + ":" + stat.size + ":" + stat.mtimeMs + ":" + contentHash;
  })
  .join("\n");
const fingerprint = createHash("sha256")
  .update(head + "\n" + status + "\n" + stagedDiff + "\n" + diff + "\n" + untracked)
  .digest("hex");

const canonicalLogPath = join("docs", "agents", "build-logs", "build-log.md");
const preflightPhaseHeader =
  "| Phase | Status | Branch | Started | Completed | Evidence | Blockers |\n|---|---|---|---|---|---|---|";
const preflightTaskHeader =
  "| Task | Result | Completed | Evidence |\n|---|---|---|---|";
const preflightPhaseNames = Array.from({ length: 7 }, (_, index) => "Phase " + index);

const validateExistingCanonicalLog = () => {
  if (!existsSync(canonicalLogPath)) return;
  const content = readFileSync(canonicalLogPath, "utf8");
  const phaseStart = content.indexOf("## Phase summary");
  const taskStart = content.indexOf("\n## Task verification receipts");
  const activityStart = content.indexOf("\n## Append-only activity");
  const phaseSection = phaseStart >= 0 && taskStart > phaseStart ? content.slice(phaseStart, taskStart) : "";
  const validPhaseRows = preflightPhaseNames.every((phase) =>
    new RegExp("^\\| " + phase + " \\| (Not started|In progress|Blocked|Complete) \\|", "m").test(phaseSection),
  );
  const valid =
    phaseStart >= 0 &&
    content.includes("## Phase summary\n\n" + preflightPhaseHeader + "\n") &&
    validPhaseRows &&
    taskStart > phaseStart &&
    content.includes("## Task verification receipts\n\n" + preflightTaskHeader + "\n") &&
    activityStart > taskStart;
  if (!valid) {
    throw new Error(canonicalLogPath + " has malformed phase, task, or activity structure; preserving it without running checks");
  }
};

validateExistingCanonicalLog();
const checks = ["lint", "typecheck", "test", "build"];
const results = [];
for (const check of checks) {
  const started = Date.now();
  const result = spawnSync("npm", ["run", check], { stdio: "inherit" });
  results.push({ check, code: result.status ?? 1, seconds: Math.round((Date.now() - started) / 1000) });
  if (result.status !== 0) break;
}

const passed = results.length === checks.length && results.every(({ code }) => code === 0);
validateExistingCanonicalLog();
const directory = join("docs", "agents", "build-logs", task);
mkdirSync(directory, { recursive: true });
const completedAt = new Date().toISOString();
const mdCode = String.fromCharCode(96);

// Only observed system metadata is written. Arbitrary --progress and --next text
// is intentionally accepted for compatibility but omitted from local evidence.
const safeText = (value, fallback = "—") =>
  String(value ?? fallback)
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|")
    .replace(new RegExp(mdCode, "g"), "'")
    .slice(0, 240);

const resultLine = ({ check, code, seconds }) =>
  "| " + mdCode + "npm run " + check + mdCode + " | " + code + " | " + seconds + " |";
const checksObserved = results.length
  ? results.map(({ check, code }) => mdCode + "npm run " + check + mdCode + " exit " + code).join("; ")
  : "No checks observed";
const skippedChecks = checks.slice(results.length);
const skippedLine = skippedChecks.length
  ? " Skipped after the first failure: " + skippedChecks.map((check) => mdCode + "npm run " + check + mdCode).join(", ") + "."
  : "";

const lines = [
  "# " + task + " verification",
  "",
  "- Started (UTC): " + startedAt,
  "- Completed (UTC): " + completedAt,
  "- Branch: " + mdCode + safeText(branch) + mdCode,
  "- Git HEAD: " + mdCode + head + mdCode,
  "- Working-tree fingerprint: " + mdCode + fingerprint + mdCode,
  "- Result: " + (passed ? "passed" : "failed"),
  "- Progress: Omitted from local evidence; caller free text is not recorded.",
  "- Next: Omitted from local evidence; caller free text is not recorded.",
  "",
  "| Command | Exit | Seconds |",
  "|---|---:|---:|",
  ...results.map(resultLine),
  "",
  "Observed checks: " + checksObserved + "." + skippedLine,
  "",
  "This local record is valid only while Git HEAD and the working-tree fingerprint match. CI output holds full logs.",
  "No secrets, environment values, arbitrary caller text, or raw command output are recorded here.",
  "",
];
writeFileSync(join(directory, "STATUS.md"), lines.join("\n"));

const phaseSummaryHeader =
  "| Phase | Status | Branch | Started | Completed | Evidence | Blockers |\n|---|---|---|---|---|---|---|";
const taskReceiptHeader =
  "| Task | Result | Completed | Evidence |\n|---|---|---|---|";

// New local logs start without inferred completion. Existing phase rows are preserved.
const phaseRows = [
  {
    phase: "Phase 0",
    status: "Not started",
    branch: "—",
    started: "—",
    completed: "—",
    evidence: "docs/implementation-plan.md#phase-0-foundation-and-walking-skeleton (planned scope only)",
    blockers: "Inspect durable Phase 0 acceptance evidence before changing status.",
  },
  {
    phase: "Phase 1",
    status: "Not started",
    branch: "—",
    started: "—",
    completed: "—",
    evidence: "docs/implementation-plan.md#phase-1-terrain-engine-and-viewport (planned scope only)",
    blockers: "Dependency triage issue #19 must be resolved before Phase 1.",
  },
  {
    phase: "Phase 2",
    status: "Not started",
    branch: "—",
    started: "—",
    completed: "—",
    evidence: "docs/implementation-plan.md#phase-2-canvas-artwork-and-editor-behavior (planned scope only)",
    blockers: "Phase 1 acceptance evidence is not recorded.",
  },
  {
    phase: "Phase 3",
    status: "Not started",
    branch: "—",
    started: "—",
    completed: "—",
    evidence: "docs/implementation-plan.md#phase-3-identity-ownership-and-draft-autosave (planned scope only)",
    blockers: "Phase 2 acceptance evidence is not recorded.",
  },
  {
    phase: "Phase 4",
    status: "Not started",
    branch: "—",
    started: "—",
    completed: "—",
    evidence: "docs/implementation-plan.md#phase-4-lore-and-interactive-map-content (planned scope only)",
    blockers: "Phase 3 acceptance evidence is not recorded.",
  },
  {
    phase: "Phase 5",
    status: "Not started",
    branch: "—",
    started: "—",
    completed: "—",
    evidence: "docs/implementation-plan.md#phase-5-atomic-publication-and-explorer-experience (planned scope only)",
    blockers: "Phase 4 acceptance evidence is not recorded.",
  },
  {
    phase: "Phase 6",
    status: "Not started",
    branch: "—",
    started: "—",
    completed: "—",
    evidence: "docs/implementation-plan.md#phase-6-moderation-deletion-and-launch-hardening (planned scope only)",
    blockers: "Phase 5 acceptance evidence is not recorded.",
  },
];

const readTaskReceipts = () => {
  const root = join("docs", "agents", "build-logs");
  if (!existsSync(root)) return [];

  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const receiptPath = join(root, entry.name, "STATUS.md");
      if (!existsSync(receiptPath)) return null;
      const receipt = readFileSync(receiptPath, "utf8");
      const observedAt = receipt.match(/^- Completed \(UTC\): (.+)$/m)?.[1] ??
        receipt.match(/^- Time \(UTC\): (.+)$/m)?.[1] ??
        "—";
      const result = receipt.match(/^- Result: (passed|failed)$/m)?.[1] ?? "unknown";
      return {
        task: entry.name,
        result,
        completed: result === "passed" ? observedAt : "—",
        evidence: "docs/agents/build-logs/" + entry.name + "/STATUS.md",
      };
    })
    .filter(Boolean);
};

const formatPhaseRow = (row) =>
  "| " + safeText(row.phase) + " | " + row.status + " | " + safeText(row.branch) + " | " +
  safeText(row.started) + " | " + safeText(row.completed) + " | " +
  safeText(row.evidence) + " | " + safeText(row.blockers) + " |";

const formatTaskReceiptRow = (row) =>
  "| " + safeText(row.task) + " | " + row.result + " | " +
  safeText(row.completed) + " | " + safeText(row.evidence) + " |";

const renderCanonicalLog = (activityBody = "") => [
  "# Build Log",
  "",
  "Ignored local source of truth for observed phase status, task verification evidence, and phase activity.",
  "Phase status changes require phase acceptance evidence; task verification never changes phase status automatically.",
  "Planned work is not evidence. The phase summary is current; activity entries are append-only. Task results are historical until their HEAD and fingerprint match the current tree.",
  "",
  "## Phase summary",
  "",
  phaseSummaryHeader,
  ...phaseRows.map(formatPhaseRow),
  "",
  "## Task verification receipts",
  "",
  taskReceiptHeader,
  ...readTaskReceipts().sort((a, b) => a.task.localeCompare(b.task)).map(formatTaskReceiptRow),
  "",
  "## Append-only activity",
  "",
  "Corrections append a new activity entry naming the corrected entry and the evidence that changed.",
  activityBody ? "\n" + activityBody.trimStart() : "",
  "",
].join("\n");

const updateTaskReceiptTable = (content) => {
  const rows = readTaskReceipts().sort((a, b) => a.task.localeCompare(b.task)).map(formatTaskReceiptRow).join("\n");
  return content.replace(
    /(## Task verification receipts\n\n\| Task \| Result \| Completed \| Evidence \|\n\|---\|---\|---\|---\|\n)([\s\S]*?)(?=\n## Append-only activity)/,
    "$1" + rows + "\n",
  );
};

const loadLog = () => {
  if (!existsSync(canonicalLogPath)) {
    mkdirSync(join("docs", "agents", "build-logs"), { recursive: true });
    writeFileSync(canonicalLogPath, renderCanonicalLog());
  } else {
    const existing = readFileSync(canonicalLogPath, "utf8");
    const activityIndex = existing.indexOf("\n## Append-only activity");
    const hasAllPhases = phaseRows.every(({ phase }) => existing.includes("| " + phase + " |"));
    if (activityIndex === -1 || !hasAllPhases || !existing.includes("## Task verification receipts")) {
      throw new Error(canonicalLogPath + " has malformed phase, task, or activity structure; preserving it without rewriting");
    }
  }

  const updated = updateTaskReceiptTable(readFileSync(canonicalLogPath, "utf8"));
  writeFileSync(canonicalLogPath, updated);
  return updated;
};

const logContent = loadLog();
const activityScope = phaseNumber ? "Phase " + phaseNumber + " (phase status unchanged by verifier)" : "No phase assigned";
const activity = [
  "## " + completedAt + " — Task " + safeText(task) + ": verification run",
  "",
  "- **Status:** Task verification " + mdCode + (passed ? "passed" : "failed") + mdCode + "; phase summary unchanged.",
  "- **Branch:** " + mdCode + safeText(branch) + mdCode,
  "- **Authorized scope:** Task verification for " + mdCode + safeText(task) + mdCode + "; " + activityScope + ".",
  "- **Changes:** Verification receipt written; source files were not changed by this script.",
  "- **Red:** Not applicable; this command records verification evidence and does not define a failing implementation check.",
  "- **Green:** " + (passed ? checksObserved + "." : "Not achieved; " + checksObserved + ".") + skippedLine,
  "- **Refactor:** Not applicable; no implementation refactor was performed.",
  "- **Verification:** " + checksObserved + "." + skippedLine,
  "- **Review:** Not run by this local verification command.",
  "- **Operational evidence:** No deployment, recovery, or external system check was run.",
  "- **Limitations:** Local task receipt only; phase acceptance, CI, deployment, review, and recovery evidence remain separate.",
  "- **Blockers:** " + (passed ? "None" : mdCode + "npm run " + (results.at(-1)?.check ?? "unknown") + mdCode + " exited " + (results.at(-1)?.code ?? 1)),
  "- **Next action:** Omitted; caller free text is not evidence.",
  "- **Evidence references:** " + mdCode + "docs/agents/build-logs/" + task + "/STATUS.md" + mdCode + "; Git HEAD " + mdCode + head + mdCode + "; working-tree fingerprint " + mdCode + fingerprint + mdCode + ".",
  "",
].join("\n");

writeFileSync(canonicalLogPath, logContent.trimEnd() + "\n\n" + activity, { encoding: "utf8" });
process.exitCode = passed ? 0 : 1;
