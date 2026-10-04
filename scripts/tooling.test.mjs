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

test("change logger appends after legacy bytes and keeps rejected writes unchanged", (t) => {
  const f = fixture();
  t.after(f.cleanup);
  const path = logPath(f.root);
  mkdirSync(join(f.root, "docs", "agents", "build-logs"), { recursive: true });
  const legacy = "legacy bytes without a trailing newline";
  writeFileSync(path, legacy);
  const valid = writeEvent(f.root, "valid.json", { id: "valid", kind: "implementation", summary: "later", details: ["one", "two"] });
  let result = run(logger, f.root, ["--input", valid], { MAP_BUILDER_LOG_TIME: "2026-10-04T00:00:00.000Z" });
  assert.equal(result.status, 0, result.stderr);
  const rendered = readFileSync(path, "utf8");
  assert.equal(rendered.startsWith(legacy), true);
  assert.match(rendered, /Details:\*\*\n  - one\n  - two/);
  const before = rendered;
  const malformed = writeEvent(f.root, "bad.json", { id: "bad", kind: "scope", summary: "x", extra: "reject" });
  result = run(logger, f.root, ["--input", malformed]);
  assert.equal(result.status, 1);
  assert.equal(readFileSync(path, "utf8"), before);
  const badCorrection = writeEvent(f.root, "bad-correction.json", { id: "bad-correction", kind: "correction", summary: "wrong", corrects: "missing" });
  result = run(logger, f.root, ["--input", badCorrection]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /correction target does not exist/);
  assert.equal(readFileSync(path, "utf8"), before);
  const lock = mkdtempSync(join(tmpdir(), "map-builder-change-lock-"));
  result = run(logger, f.root, ["--input", valid], { MAP_BUILDER_LOG_LOCK_PATH: lock });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /busy.*retry/);
  assert.equal(readFileSync(path, "utf8"), before);
  rmSync(lock, { recursive: true, force: true });
});

test("change logger rendering is deterministic and details must be bounded arrays", (t) => {
  const left = fixture();
  const right = fixture();
  t.after(() => { left.cleanup(); right.cleanup(); });
  const event = { id: "deterministic", kind: "decision", summary: "Stable output", details: ["one"], references: ["issue-1"] };
  const leftInput = writeEvent(left.root, "event.json", event);
  const rightInput = writeEvent(right.root, "event.json", event);
  const env = { MAP_BUILDER_LOG_TIME: "2026-10-04T00:00:00.000Z" };
  assert.equal(run(logger, left.root, ["--input", leftInput], env).status, 0);
  assert.equal(run(logger, right.root, ["--input", rightInput], env).status, 0);
  assert.equal(readFileSync(logPath(left.root), "utf8"), readFileSync(logPath(right.root), "utf8"));
  const badDetails = writeEvent(left.root, "bad-details.json", { id: "bad-details", kind: "scope", summary: "x", details: "string" });
  let result = run(logger, left.root, ["--input", badDetails]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /details must be an array/);
  const tooMany = writeEvent(left.root, "too-many.json", { id: "too-many", kind: "scope", summary: "x", details: Array.from({ length: 9 }, () => "x") });
  result = run(logger, left.root, ["--input", tooMany]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /details must be an array/);
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

test("change logger ignores marker text embedded in legacy narrative", (t) => {
  const f = fixture();
  t.after(f.cleanup);
  const path = logPath(f.root);
  mkdirSync(join(f.root, "docs", "agents", "build-logs"), { recursive: true });
  writeFileSync(path, "Legacy summary quoted <!-- change-id: spoofed -->\n");
  const correction = writeEvent(f.root, "correction.json", {
    id: "correction-1",
    kind: "correction",
    summary: "Must fail",
    corrects: "spoofed",
  });
  let result = run(logger, f.root, ["--input", correction]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /correction target does not exist/);
  assert.equal(readFileSync(path, "utf8"), "Legacy summary quoted <!-- change-id: spoofed -->\n");
  const real = writeEvent(f.root, "real.json", {
    id: "spoofed",
    kind: "decision",
    summary: "Real event",
    details: ["line one\u2028line two\u2029line three"],
  });
  result = run(logger, f.root, ["--input", real], { MAP_BUILDER_LOG_TIME: "2026-10-04T00:00:00.000Z" });
  assert.equal(result.status, 0, result.stderr);
  const output = readFileSync(path, "utf8");
  assert.equal(output.includes("\u2028"), false);
  assert.equal(output.includes("\u2029"), false);
  assert.match(output, /change-id: spoofed/);
});

test("explorer supports all pinned JavaScript and TypeScript grammar extensions", (t) => {
  const f = fixture();
  t.after(f.cleanup);
  writeFileSync(join(f.root, "a.js"), "import thing, { named as alias } from 'pkg'; export const value = thing; export default function run() {}");
  writeFileSync(join(f.root, "b.jsx"), "export function View() { return null; }");
  writeFileSync(join(f.root, "c.mjs"), "export { value as renamed };");
  writeFileSync(join(f.root, "d.cjs"), "const moduleValue = require('pkg'); exports.named = moduleValue; module.exports = moduleValue;");
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
  assert.ok(parsed.files.find((file) => file.path === "d.cjs").imports.some((found) => found.name === "moduleValue" && found.source === "pkg"));
  assert.ok(parsed.files.find((file) => file.path === "d.cjs").exports.some((found) => found.name === "default" && found.kind === "commonjs"));
  assert.ok(parsed.files.find((file) => file.path === "d.cjs").exports.some((found) => found.name === "named" && found.kind === "commonjs"));
  assert.ok(parsed.files.find((file) => file.path === "e.ts").declarations.some((found) => found.name === "Profile"));
  assert.ok(parsed.files.find((file) => file.path === "f.tsx").exports.some((found) => found.name === "App"));
});

test("explorer reports star and namespace re-exports", (t) => {
  const f = fixture();
  t.after(f.cleanup);
  writeFileSync(join(f.root, "exports.js"), "export * from './all.js'; export * as namespace from './namespace.js';");
  const result = run(explorer, f.root, ["exports.js", "--json"]);
  assert.equal(result.status, 0, result.stderr);
  const found = JSON.parse(result.stdout).files[0].exports;
  assert.ok(found.some((entry) => entry.name === "*" && entry.kind === "star" && entry.source === "./all.js"));
  assert.ok(found.some((entry) => entry.name === "namespace" && entry.kind === "namespace" && entry.source === "./namespace.js"));
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

test("explorer rejects in-repository symlink ancestors and explicit ignored paths", (t) => {
  const f = fixture();
  t.after(f.cleanup);
  mkdirSync(join(f.root, "real-source"));
  writeFileSync(join(f.root, "real-source", "source.js"), "const value = 1;");
  symlinkSync(join(f.root, "real-source"), join(f.root, "linked-source"), "dir");
  let result = run(explorer, f.root, ["linked-source/source.js"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /symlink ancestor/);
  mkdirSync(join(f.root, "node_modules"), { recursive: true });
  writeFileSync(join(f.root, "node_modules", "installed.js"), "const installed = 1;");
  result = run(explorer, f.root, ["node_modules/installed.js"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ignored directory/);
  mkdirSync(join(f.root, "docs", "agents", "build-logs"), { recursive: true });
  const query = join(f.root, "docs", "agents", "build-logs", "query.scm");
  writeFileSync(query, "(identifier) @name");
  writeFileSync(join(f.root, "source.js"), "const value = 1;");
  result = run(explorer, f.root, ["source.js", "--query", query]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ignored directory/);
});
