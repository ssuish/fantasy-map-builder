import assert from "node:assert/strict";
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import test from "node:test";

const logger = fileURLToPath(new URL("./log-change.mjs", import.meta.url));
const explorer = fileURLToPath(new URL("./explore.mjs", import.meta.url));
const git = (cwd, args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), "map-builder-tooling-"));
  git(root, ["init", "--initial-branch=main"]);
  git(root, ["config", "user.email", "tooling-test@example.invalid"]);
  git(root, ["config", "user.name", "tooling-test"]);
  writeFileSync(join(root, ".gitignore"), "/docs/agents/build-logs/\n");
  writeFileSync(join(root, "README.md"), "fixture\n");
  git(root, ["add", ".gitignore", "README.md"]);
  git(root, ["commit", "-m", "fixture"]);
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
};
const run = (script, root, args, env = {}) => spawnSync(process.execPath, [script, ...args], {
  cwd: root,
  env: { ...process.env, ...env },
  encoding: "utf8",
});
const logPath = (root) => join(root, "docs", "agents", "build-logs", "build-log.md");
const writeEvent = (root, name, value) => {
  const path = join(root, name);
  writeFileSync(path, JSON.stringify(value));
  return path;
};

test("change logger validates, renders metadata, preserves legacy bytes, rejects duplicates, and records corrections", (t) => {
  const f = fixture();
  t.after(f.cleanup);
  const firstInput = writeEvent(f.root, "event.json", {
    id: "scope-1",
    kind: "scope",
    summary: "Pilot scope chosen",
    details: ["Bounded details\\nwith a pipe | and markdown " + String.fromCharCode(96) + "mark" + String.fromCharCode(96) + "."],
    references: ["issue-1", "docs/scope.md"],
  });
  let result = run(logger, f.root, ["--input", firstInput], { MAP_BUILDER_LOG_TIME: "2026-10-04T00:00:00.000Z" });
  assert.equal(result.status, 0, result.stderr);
  const first = readFileSync(logPath(f.root), "utf8");
  assert.match(first, /# Build Log/);
  assert.match(first, /change-id: scope-1/);
  assert.match(first, /2026-10-04T00:00:00.000Z/);
  assert.match(first, /Git HEAD/);
  assert.match(first, /Working tree.*dirty/);
  assert.equal(first.includes("PRIVATE"), false);
  const duplicateBefore = first;
  result = run(logger, f.root, ["--input", firstInput], { MAP_BUILDER_LOG_TIME: "2026-10-04T00:01:00.000Z" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /duplicate change id/);
  assert.equal(readFileSync(logPath(f.root), "utf8"), duplicateBefore);
  writeEvent(f.root, "correction.json", {
    id: "scope-1-correction",
    kind: "correction",
    summary: "Scope clarified",
    corrects: "scope-1",
  });
  result = run(logger, f.root, ["--input", join(f.root, "correction.json")], { MAP_BUILDER_LOG_TIME: "2026-10-04T00:02:00.000Z" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(logPath(f.root), "utf8"), /Corrects.*scope-1/);
});

test("change logger leaves bytes unchanged for malformed input and contention", (t) => {
  const f = fixture();
  t.after(f.cleanup);
  const path = logPath(f.root);
  mkdirSync(join(f.root, "docs", "agents", "build-logs"), { recursive: true });
  const legacy = "legacy bytes\nwithout a schema";
  writeFileSync(path, legacy);
  const malformed = writeEvent(f.root, "bad.json", { id: "bad", kind: "scope", summary: "x", extra: "reject" });
  let result = run(logger, f.root, ["--input", malformed]);
  assert.equal(result.status, 1);
  assert.equal(readFileSync(path, "utf8"), legacy);
  const lock = mkdtempSync(join(tmpdir(), "map-builder-change-lock-"));
  const valid = writeEvent(f.root, "valid.json", { id: "valid", kind: "implementation", summary: "later" });
  result = run(logger, f.root, ["--input", valid], { MAP_BUILDER_LOG_LOCK_PATH: lock });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /busy.*retry/);
  assert.equal(readFileSync(path, "utf8"), legacy);
  rmSync(lock, { recursive: true, force: true });
});

test("change logger rejects private and symlink input paths", (t) => {
  const f = fixture();
  t.after(f.cleanup);
  const privatePath = join(f.root, ".env.local");
  writeFileSync(privatePath, JSON.stringify({ id: "secret", kind: "scope", summary: "private" }));
  let result = run(logger, f.root, ["--input", privatePath]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /private/);
  const target = writeEvent(f.root, "real.json", { id: "real", kind: "scope", summary: "target" });
  const link = join(f.root, "link.json");
  symlinkSync(target, link);
  result = run(logger, f.root, ["--input", link]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /symlink/);
});

test("explorer supports all pinned JavaScript and TypeScript grammar extensions", (t) => {
  const f = fixture();
  t.after(f.cleanup);
  writeFileSync(join(f.root, "a.js"), "import thing, { named as alias } from 'pkg'; export const value = thing; export default function run() {}");
  writeFileSync(join(f.root, "b.jsx"), "export function View() { return null; }");
  writeFileSync(join(f.root, "c.mjs"), "export { value as renamed };");
  writeFileSync(join(f.root, "d.cjs"), "const moduleValue = 1; module.exports = moduleValue;");
  writeFileSync(join(f.root, "e.ts"), "import type { User } from './user'; export interface Profile { user: User }; type Alias = string;");
  writeFileSync(join(f.root, "f.tsx"), "export default function App() { return <div />; }");
  writeFileSync(join(f.root, "g.mts"), "export const modern = 1;");
  writeFileSync(join(f.root, "h.cts"), "export const common = 1;");
  const result = run(explorer, f.root, [".", "--json"]);
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.files.length, 8);
  assert.deepEqual(parsed.files.map((file) => file.path), ["a.js", "b.jsx", "c.mjs", "d.cjs", "e.ts", "f.tsx", "g.mts", "h.cts"]);
  assert.ok(parsed.files.find((file) => file.path === "a.js").imports.some((found) => found.name === "thing"));
  assert.ok(parsed.files.find((file) => file.path === "e.ts").declarations.some((found) => found.name === "Profile"));
  assert.ok(parsed.files.find((file) => file.path === "f.tsx").exports.some((found) => found.name === "App"));
});

test("explorer query captures are named and located, and parse errors are explicit", (t) => {
  const f = fixture();
  t.after(f.cleanup);
  writeFileSync(join(f.root, "source.ts"), "const answer = 42;\nexport { answer };\n");
  const query = join(f.root, "names.scm");
  writeFileSync(query, "(identifier) @name");
  let result = run(explorer, f.root, ["source.ts", "--query", query, "--json"]);
  assert.equal(result.status, 0, result.stderr);
  const captures = JSON.parse(result.stdout).files[0].captures;
  assert.ok(captures.some((capture) => capture.name === "name" && capture.text === "answer" && capture.location.start.line === 1));
  writeFileSync(join(f.root, "broken.ts"), "export const = ;");
  result = run(explorer, f.root, ["broken.ts"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /parse error/);
});

test("explorer rejects outside, unsupported, private, and symlink paths", (t) => {
  const f = fixture();
  t.after(f.cleanup);
  const outside = mkdtempSync(join(tmpdir(), "map-builder-explorer-outside-"));
  writeFileSync(join(f.root, "plain.txt"), "x");
  writeFileSync(join(f.root, ".env.js"), "const secret = 1;");
  const link = join(f.root, "outside.js");
  writeFileSync(join(outside, "source.js"), "const x = 1;");
  symlinkSync(join(outside, "source.js"), link);
  for (const input of ["plain.txt", ".env.js", link, outside]) {
    const result = run(explorer, f.root, [input]);
    assert.equal(result.status, 1, input);
  }
  rmSync(outside, { recursive: true, force: true });
});
