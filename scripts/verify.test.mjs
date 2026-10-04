import assert from "node:assert/strict";
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const verifier = fileURLToPath(new URL("./verify.mjs", import.meta.url));
const git = (cwd, args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
const createFixture = () => {
  const root = mkdtempSync(join(tmpdir(), "map-builder-verify-"));
  const tools = mkdtempSync(join(tmpdir(), "map-builder-verify-tools-"));
  const calls = join(tools, "calls.log");
  const bin = join(tools, "bin");
  mkdirSync(bin);
  const npmPath = join(bin, "npm");
  writeFileSync(npmPath, [
    "#!/usr/bin/env node",
    "import fs from 'node:fs';",
    "const check = process.argv[3] ?? 'unknown';",
    "if (process.env.CALLS_FILE) fs.appendFileSync(process.env.CALLS_FILE, check + '\\n');",
    "if (process.env.STUB_FAIL_CHECK === check) process.exit(7);",
  ].join("\n"));
  chmodSync(npmPath, 0o755);
  git(root, ["init", "--initial-branch=main"]);
  git(root, ["config", "user.email", "verify-test@example.invalid"]);
  git(root, ["config", "user.name", "verify-test"]);
  writeFileSync(join(root, ".gitignore"), "/docs/agents/verification/\n");
  writeFileSync(join(root, "README.md"), "fixture\n");
  git(root, ["add", ".gitignore", "README.md"]);
  git(root, ["commit", "-m", "fixture"]);
  const env = { ...process.env, PATH: bin + ":" + process.env.PATH, CALLS_FILE: calls };
  return {
    root,
    calls,
    env,
    cleanup: () => {
      rmSync(root, { recursive: true, force: true });
      rmSync(tools, { recursive: true, force: true });
    },
  };
};
const run = (fixture, args = [], extraEnv = {}) => spawnSync(process.execPath, [verifier, ...args], {
  cwd: fixture.root,
  env: { ...fixture.env, ...extraEnv },
  encoding: "utf8",
});
const receiptPath = (fixture, task) => join(fixture.root, "docs", "agents", "verification", task, "STATUS.md");
const calls = (fixture) => existsSync(fixture.calls) ? readFileSync(fixture.calls, "utf8") : "";
const fingerprint = (fixture, task) => readFileSync(receiptPath(fixture, task), "utf8").split("\n")
  .find((line) => line.startsWith("- Working-tree fingerprint:"))?.match(/[a-f0-9]{64}/)?.[0];

test("verifier fails fast, records skipped checks, and writes the new receipt path", (t) => {
  const fixture = createFixture();
  t.after(fixture.cleanup);
  const result = run(fixture, ["--task", "failed-first"], { STUB_FAIL_CHECK: "lint" });
  assert.equal(result.status, 1, result.stderr);
  const output = readFileSync(receiptPath(fixture, "failed-first"), "utf8");
  assert.match(output, /Result: failed/);
  assert.match(output, /npm run lint.*\| 7 \|/);
  assert.match(output, /Skipped after the first failure: npm run typecheck, npm run test, npm run build/);
  assert.equal(calls(fixture), "lint\n");
  assert.equal(existsSync(join(fixture.root, "docs", "agents", "build-logs", "build-log.md")), false);
  assert.deepEqual(readdirSync(join(fixture.root, "docs", "agents", "verification", "failed-first")).filter((name) => name.endsWith(".tmp")), []);
});

test("retired phase and caller-text flags fail before any check", (t) => {
  const fixture = createFixture();
  t.after(fixture.cleanup);
  for (const args of [["--task", "retired", "--phase", "1"], ["--task", "retired", "--progress", "x"], ["--task", "retired", "--next", "y"]]) {
    const result = run(fixture, args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /was retired/);
  }
  assert.equal(calls(fixture), "");
  assert.equal(existsSync(join(fixture.root, "docs", "agents", "verification")), false);
});

test("malformed legacy build logs remain untouched and no legacy log is read", (t) => {
  const fixture = createFixture();
  t.after(fixture.cleanup);
  const path = join(fixture.root, "docs", "agents", "build-logs", "build-log.md");
  mkdirSync(dirname(path), { recursive: true });
  const legacy = "# malformed legacy bytes\n| Phase 0 | broken |\n";
  writeFileSync(path, legacy);
  const result = run(fixture, ["--task", "legacy-preserved"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(path, "utf8"), legacy);
});

test("fingerprint changes with untracked content and excludes private contents", (t) => {
  const fixture = createFixture();
  t.after(fixture.cleanup);
  const source = join(fixture.root, "source.txt");
  const secret = join(fixture.root, ".env.local");
  writeFileSync(source, "alpha");
  writeFileSync(secret, "PRIVATE_ONE");
  let result = run(fixture, ["--task", "freshness"]);
  assert.equal(result.status, 0, result.stderr);
  const first = fingerprint(fixture, "freshness");
  assert.ok(first);
  writeFileSync(source, "omega");
  result = run(fixture, ["--task", "freshness"]);
  assert.equal(result.status, 0, result.stderr);
  assert.notEqual(fingerprint(fixture, "freshness"), first);
  const evidence = readFileSync(receiptPath(fixture, "freshness"), "utf8");
  assert.equal(evidence.includes("PRIVATE_ONE"), false);
});

test("symlinked receipt directory is rejected before checks", (t) => {
  const fixture = createFixture();
  t.after(fixture.cleanup);
  mkdirSync(join(fixture.root, "docs", "agents"), { recursive: true });
  const outside = mkdtempSync(join(tmpdir(), "map-builder-receipt-outside-"));
  symlinkSync(outside, join(fixture.root, "docs", "agents", "verification"), "dir");
  const result = run(fixture, ["--task", "symlink"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /symlinked receipt directory/);
  assert.equal(calls(fixture), "");
  assert.equal(lstatSync(join(fixture.root, "docs", "agents", "verification")).isSymbolicLink(), true);
  rmSync(outside, { recursive: true, force: true });
});
