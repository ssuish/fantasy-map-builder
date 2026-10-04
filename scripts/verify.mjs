import { createHash, randomBytes } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readlinkSync,
  renameSync,
  rmSync,
  writeSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim());
process.chdir(root);
const args = process.argv.slice(2);
const readOption = (name, fallback = undefined) => {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  if (index === args.length - 1 || args[index + 1].startsWith("--")) {
    throw new Error(name + " requires a value");
  }
  return args[index + 1];
};

for (const retired of ["--phase", "--progress", "--next"]) {
  if (args.some((arg) => arg === retired || arg.startsWith(retired + "="))) {
    throw new Error(retired + " was retired: run npm run verify -- --task <slug>; record scope or decisions with npm run log:change -- --input <file>");
  }
}

const task = readOption("--task", "local");
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(task)) {
  throw new Error("--task must be a lowercase kebab-case slug");
}
const known = new Set(["--task"]);
for (let index = 0; index < args.length; index += 1) {
  if (args[index].startsWith("--") && !known.has(args[index])) {
    throw new Error("Unknown option " + args[index]);
  }
}

const git = (...gitArgs) => execFileSync("git", gitArgs, {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
}).trim();
const isPrivatePath = (candidate) => {
  const normalized = candidate.replaceAll("\\", "/");
  return normalized.split("/").some((part) =>
    (part.startsWith(".env") && part !== ".env.example") || /^CREDENTIALS(?:\.|$)/i.test(part),
  );
};

const assertSafeOutputPath = (absolutePath) => {
  const resolved = resolve(absolutePath);
  const relativePath = relative(root, resolved);
  if (relativePath.startsWith("..") || relativePath === "") {
    throw new Error("verification receipt path must stay inside the repository");
  }
  if (isPrivatePath(relativePath)) throw new Error("verification receipt path may not be private");
  let current = root;
  for (const part of relativePath.split(/[\\/]/).slice(0, -1)) {
    current = join(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) {
      throw new Error("refusing symlinked receipt directory: " + relative(root, current));
    }
  }
  if (existsSync(resolved) && lstatSync(resolved).isSymbolicLink()) {
    throw new Error("refusing symlinked verification receipt");
  }
  return resolved;
};

const safeGitDiff = (staged) => {
  const names = execFileSync("git", ["diff", ...(staged ? ["--cached"] : []), "--name-only", "-z"], {
    cwd: root,
    encoding: "buffer",
    maxBuffer: 20 * 1024 * 1024,
  }).toString("utf8").split("\0").filter(Boolean);
  return names.filter((name) => !isPrivatePath(name)).map((name) =>
    execFileSync("git", ["diff", ...(staged ? ["--cached"] : []), "--binary", "--", ":(literal)" + name], {
      cwd: root,
      encoding: "buffer",
      maxBuffer: 20 * 1024 * 1024,
    }).toString("base64"),
  ).join("\n");
};

const untrackedFingerprint = () => {
  const paths = execFileSync("git", ["ls-files", "--others", "--exclude-standard", "-z"], {
    cwd: root,
    encoding: "buffer",
    maxBuffer: 20 * 1024 * 1024,
  }).toString("utf8").split("\0").filter(Boolean).sort();
  return paths.map((path) => {
    const absolute = resolve(root, path);
    let info;
    try {
      info = lstatSync(absolute);
    } catch {
      return path + ":missing";
    }
    if (isPrivatePath(path)) return path + ":private:" + info.mode + ":" + info.size + ":" + info.mtimeMs;
    if (info.isSymbolicLink()) return path + ":symlink:" + readlinkSync(absolute);
    if (!info.isFile()) return path + ":non-file:" + info.mode + ":" + info.size + ":" + info.mtimeMs;
    return path + ":" + info.size + ":" + info.mtimeMs + ":" +
      createHash("sha256").update(readFileSync(absolute)).digest("hex");
  }).join("\n");
};

const treeFingerprint = (head, status) => createHash("sha256")
  .update(head + "\n" + status + "\n" + safeGitDiff(false) + "\n" + safeGitDiff(true) + "\n" + untrackedFingerprint())
  .digest("hex");

const receiptPath = join(root, "docs", "agents", "verification", task, "STATUS.md");

const writeAtomic = (target, content) => {
  const absolute = assertSafeOutputPath(target);
  const directory = dirname(absolute);
  mkdirSync(directory, { recursive: true });
  const temporary = join(directory, ".STATUS.md." + process.pid + "." + randomBytes(8).toString("hex") + ".tmp");
  let descriptor;
  try {
    descriptor = openSync(temporary, "wx", 0o600);
    writeSync(descriptor, content, null, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporary, absolute);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    rmSync(temporary, { force: true });
  }
};

const head = git("rev-parse", "HEAD");
const branch = git("branch", "--show-current") || "detached";
const startedAt = new Date().toISOString();
const status = git("status", "--porcelain=v1", "--untracked-files=all");
const fingerprint = treeFingerprint(head, status);
assertSafeOutputPath(receiptPath);
const checks = ["lint", "typecheck", "test", "build"];
const results = [];

for (const check of checks) {
  const started = Date.now();
  const result = spawnSync("npm", ["run", check], { cwd: root, stdio: "inherit" });
  const code = result.error ? 1 : (result.status ?? 1);
  results.push({ check, code, seconds: Math.round((Date.now() - started) / 1000) });
  if (code !== 0) break;
}

const passed = results.length === checks.length && results.every(({ code }) => code === 0);
const completedAt = new Date().toISOString();
const checksObserved = results.length
  ? results.map(({ check, code }) => "npm run " + check + " exit " + code).join("; ")
  : "No checks observed";
const skipped = checks.slice(results.length);
const skippedLine = skipped.length
  ? " Skipped after the first failure: " + skipped.map((check) => "npm run " + check).join(", ") + "."
  : "";
const mdCode = String.fromCharCode(96);
const lines = [
  "# " + task + " verification",
  "",
  "- Started (UTC): " + startedAt,
  "- Completed (UTC): " + completedAt,
  "- Branch: " + mdCode + branch.replaceAll(mdCode, "'") + mdCode,
  "- Git HEAD: " + mdCode + head + mdCode,
  "- Working-tree fingerprint: " + mdCode + fingerprint + mdCode,
  "- Result: " + (passed ? "passed" : "failed"),
  "",
  "| Command | Exit | Seconds |",
  "|---|---:|---:|",
  ...results.map(({ check, code, seconds }) => "| " + mdCode + "npm run " + check + mdCode + " | " + code + " | " + seconds + " |"),
  "",
  "Observed checks: " + checksObserved + "." + skippedLine,
  "",
  "This local record is valid only while Git HEAD and the working-tree fingerprint match.",
  "No secrets, environment values, caller text, or raw command output are recorded here.",
  "",
].join("\n");
writeAtomic(receiptPath, lines);
process.exitCode = passed ? 0 : 1;
