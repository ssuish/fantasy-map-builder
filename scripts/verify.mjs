import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
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

const git = (...gitArgs) =>
  execFileSync("git", gitArgs, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }).trim();

const head = git("rev-parse", "HEAD");
const status = git("status", "--porcelain=v1", "--untracked-files=all");
const diff = git("diff", "--binary");
const untracked = git("ls-files", "--others", "--exclude-standard")
  .split("\n")
  .filter(Boolean)
  .map((path) => {
    const stat = statSync(path);
    return `${path}:${stat.size}:${stat.mtimeMs}`;
  })
  .join("\n");
const fingerprint = createHash("sha256")
  .update(`${head}\n${status}\n${diff}\n${untracked}`)
  .digest("hex");

const checks = ["lint", "typecheck", "test", "build"];
const results = [];
for (const check of checks) {
  const started = Date.now();
  const result = spawnSync("npm", ["run", check], { stdio: "inherit" });
  results.push({ check, code: result.status ?? 1, seconds: Math.round((Date.now() - started) / 1000) });
  if (result.status !== 0) break;
}

const passed = results.length === checks.length && results.every(({ code }) => code === 0);
const directory = join("docs", "agents", "build-logs", task);
mkdirSync(directory, { recursive: true });
const lines = [
  `# ${task} verification`,
  "",
  `- Time (UTC): ${new Date().toISOString()}`,
  `- Git HEAD: \`${head}\``,
  `- Working-tree fingerprint: \`${fingerprint}\``,
  `- Result: ${passed ? "passed" : "failed"}`,
  `- Progress: ${option("--progress", "Phase 0 checks")}`,
  `- Next: ${option("--next", passed ? "Continue the next milestone." : "Fix the failed check, then rerun verification.")}`,
  "",
  "| Command | Exit | Seconds |",
  "|---|---:|---:|",
  ...results.map(({ check, code, seconds }) => `| \`npm run ${check}\` | ${code} | ${seconds} |`),
  "",
  "This local record is valid only while Git HEAD and the working-tree fingerprint match. CI output holds full logs.",
  "",
];
writeFileSync(join(directory, "STATUS.md"), lines.join("\n"));
process.exitCode = passed ? 0 : 1;
