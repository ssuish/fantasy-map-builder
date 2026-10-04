import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim());
process.chdir(root);
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--input") {
  throw new Error("Usage: npm run log:change -- --input <event.json>");
}

const inputPath = resolve(process.cwd(), args[1]);
const isPrivatePath = (candidate) => candidate.replaceAll("\\", "/").split("/").some((part) =>
  (part.startsWith(".env") && part !== ".env.example") || /^CREDENTIALS(?:\.|$)/i.test(part),
);
if (isPrivatePath(inputPath)) throw new Error("private input paths are not accepted");
let inputInfo;
try {
  inputInfo = lstatSync(inputPath);
} catch {
  throw new Error("input file does not exist");
}
if (inputInfo.isSymbolicLink()) throw new Error("symlink input paths are not accepted");
if (!inputInfo.isFile()) throw new Error("input must be a regular JSON file");
let inputAncestor = dirname(inputPath);
while (inputAncestor !== dirname(inputAncestor)) {
  if (existsSync(inputAncestor) && lstatSync(inputAncestor).isSymbolicLink()) throw new Error("symlink input paths are not accepted");
  inputAncestor = dirname(inputAncestor);
}

let event;
try {
  event = JSON.parse(readFileSync(inputPath, "utf8"));
} catch (error) {
  throw new Error("input must contain valid JSON: " + error.message);
}
if (!event || typeof event !== "object" || Array.isArray(event)) throw new Error("input must be a JSON object");
const allowed = new Set(["id", "kind", "summary", "details", "references", "corrects"]);
for (const key of Object.keys(event)) {
  if (!allowed.has(key)) throw new Error("unsupported input field: " + key);
}
const kinds = new Set(["scope", "decision", "architecture", "implementation", "correction"]);
const text = (value, label, max) => {
  if (typeof value !== "string" || value.trim() === "") throw new Error(label + " must be a non-empty string");
  if (value.length > max) throw new Error(label + " exceeds " + max + " characters");
  if (value.includes("\0")) throw new Error(label + " contains a NUL byte");
  return value
    .replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/[\r\n\u2028\u2029]/g, " ")
    .replaceAll("|", "\\|")
    .replaceAll(String.fromCharCode(96), "'");
};
const id = text(event.id, "id", 80);
if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id)) throw new Error("id must use letters, numbers, dot, underscore, colon, or hyphen");
if (typeof event.kind !== "string" || !kinds.has(event.kind)) throw new Error("kind must be one of scope, decision, architecture, implementation, correction");
const summary = text(event.summary, "summary", 240);
if (event.details !== undefined && (!Array.isArray(event.details) || event.details.length > 8)) {
  throw new Error("details must be an array with at most 8 items");
}
const details = (event.details ?? []).map((detail, index) => text(detail, "details[" + index + "]", 240));
if (event.references !== undefined && (!Array.isArray(event.references) || event.references.length > 8)) {
  throw new Error("references must be an array with at most 8 items");
}
const references = (event.references ?? []).map((reference, index) => text(reference, "references[" + index + "]", 240));
const corrects = event.corrects === undefined ? undefined : text(event.corrects, "corrects", 80);
if (corrects !== undefined && !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(corrects)) {
  throw new Error("corrects must identify an existing event id");
}
if (event.kind === "correction" && corrects === undefined) throw new Error("correction entries require corrects");
if (event.kind !== "correction" && corrects !== undefined) throw new Error("corrects is only valid for correction entries");

const git = (...gitArgs) => execFileSync("git", gitArgs, {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 4 * 1024 * 1024,
}).trim();
const logPath = join(root, "docs", "agents", "build-logs", "build-log.md");
const assertSafeDirectory = (directory) => {
  const relativeDirectory = relative(root, directory);
  if (relativeDirectory.startsWith("..") || isPrivatePath(relativeDirectory)) throw new Error("change log path must stay inside the repository");
  let current = root;
  for (const part of relativeDirectory.split(/[\\/]/)) {
    if (!part) continue;
    current = join(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error("refusing symlinked change log directory");
  }
};
assertSafeDirectory(dirname(logPath));
if (existsSync(logPath) && lstatSync(logPath).isSymbolicLink()) throw new Error("refusing symlinked change log");

const lockName = "map-builder-change-log-" + createHash("sha256").update(root).digest("hex") + ".lock";
const lockPath = process.env.MAP_BUILDER_LOG_LOCK_PATH ? resolve(process.env.MAP_BUILDER_LOG_LOCK_PATH) : join(tmpdir(), lockName);
if (relative(root, lockPath) !== "" && !relative(root, lockPath).startsWith("..")) {
  throw new Error("change log lock must be outside the repository");
}
let lockHeld = false;
try {
  try {
    mkdirSync(lockPath, { recursive: false, mode: 0o700 });
    lockHeld = true;
  } catch (error) {
    if (error.code === "EEXIST") throw new Error("change log is busy; retry after the current writer exits");
    throw error;
  }
  mkdirSync(dirname(logPath), { recursive: true });
  const existing = existsSync(logPath) ? readFileSync(logPath, "utf8") : "";
  const markerPattern = /^<!-- change-id: ([A-Za-z0-9][A-Za-z0-9._:-]*) -->$/;
  const allIds = existing.split(/[\r\n\u2028\u2029]/).flatMap((line) => line.match(markerPattern)?.[1] ?? []);
  if (allIds.includes(id)) throw new Error("duplicate change id: " + id);
  if (corrects !== undefined && !allIds.includes(corrects)) throw new Error("correction target does not exist: " + corrects);
  const now = process.env.MAP_BUILDER_LOG_TIME ?? new Date().toISOString();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(now)) throw new Error("MAP_BUILDER_LOG_TIME must be an ISO UTC timestamp");
  const head = git("rev-parse", "HEAD");
  const branch = git("branch", "--show-current") || "detached";
  const dirty = git("status", "--porcelain=v1", "--untracked-files=all") !== "";
  const md = String.fromCharCode(96);
  const lines = [
    "<!-- change-id: " + id + " -->",
    "## " + now + " — " + id,
    "",
    "- **Kind:** " + md + event.kind + md,
    "- **Summary:** " + summary,
    ...(details.length === 0 ? [] : ["- **Details:**", ...details.map((detail) => "  - " + detail)]),
    ...(references.length === 0 ? [] : ["- **References:**", ...references.map((reference) => "  - " + reference)]),
    ...(corrects === undefined ? [] : ["- **Corrects:** " + md + corrects + md]),
    "- **Git HEAD:** " + md + head + md,
    "- **Branch:** " + md + branch.replaceAll(md, "'") + md,
    "- **Working tree:** " + md + (dirty ? "dirty" : "clean") + md,
    "",
  ];
  const entry = lines.join("\n");
  const prefix = existing === ""
    ? "# Build Log\n\n"
    : (existing.endsWith("\n\n") ? existing : existing.endsWith("\n") ? existing + "\n" : existing + "\n\n");
  const descriptor = openSync(logPath, "a", 0o600);
  try {
    writeSync(descriptor, (prefix === existing ? "" : prefix.slice(existing.length)) + entry, null, "utf8");
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
} finally {
  if (lockHeld) rmSync(lockPath, { recursive: true, force: true });
}
