import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const verifier = fileURLToPath(new URL("./verify.mjs", import.meta.url));
const codeMark = String.fromCharCode(96);
const fingerprintOf = (text) => text.match(new RegExp("Working-tree fingerprint: " + codeMark + "([^" + codeMark + "]+)" + codeMark))?.[1];

const git = (cwd, args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

const createFixture = () => {
  const root = mkdtempSync(join(tmpdir(), "map-builder-verify-"));
  const tools = mkdtempSync(join(tmpdir(), "map-builder-verify-tools-"));
  const calls = join(tools, "calls.log");
  const bin = join(tools, "bin");
  mkdirSync(bin);
  const npmStub = [
    "#!/usr/bin/env node",
    "import fs from 'node:fs';",
    "const check = process.argv[3] ?? 'unknown';",
    "if (process.env.CALLS_FILE) fs.appendFileSync(process.env.CALLS_FILE, check + '\\n');",
    "if (process.env.STUB_FAIL_CHECK === check) process.exit(7);",
  ].join("\n");
  const npmPath = join(bin, "npm");
  writeFileSync(npmPath, npmStub);
  chmodSync(npmPath, 0o755);

  git(root, ["init", "--initial-branch=main"]);
  git(root, ["config", "user.email", "verify-test@example.invalid"]);
  git(root, ["config", "user.name", "verify-test"]);
  writeFileSync(join(root, ".gitignore"), "/docs/agents/build-logs/\n");
  writeFileSync(join(root, "README.md"), "fixture\n");
  git(root, ["add", ".gitignore", "README.md"]);
  git(root, ["commit", "-m", "fixture"]);

  const env = {
    ...process.env,
    PATH: bin + ":" + process.env.PATH,
    CALLS_FILE: calls,
  };
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

const runVerifier = (fixture, args = [], extraEnv = {}) =>
  spawnSync(process.execPath, [verifier, ...args], {
    cwd: fixture.root,
    env: { ...fixture.env, ...extraEnv },
    encoding: "utf8",
  });

const receiptPath = (fixture, task) =>
  join(fixture.root, "docs", "agents", "build-logs", task, "STATUS.md");
const canonicalPath = (fixture) =>
  join(fixture.root, "docs", "agents", "build-logs", "build-log.md");
const receipt = (fixture, task) => readFileSync(receiptPath(fixture, task), "utf8");
const log = (fixture) => readFileSync(canonicalPath(fixture), "utf8");
const calls = (fixture) => (existsSync(fixture.calls) ? readFileSync(fixture.calls, "utf8") : "");

test("failed first check records skipped checks and failed task evidence", (t) => {
  const fixture = createFixture();
  t.after(fixture.cleanup);
  const result = runVerifier(fixture, ["--task", "failed-first"], { STUB_FAIL_CHECK: "lint" });
  assert.equal(result.status, 1, result.stderr);
  assert.match(receipt(fixture, "failed-first"), /Result: failed/);
  assert.match(receipt(fixture, "failed-first"), /npm run lint.*\| 7 \|/);
  assert.match(receipt(fixture, "failed-first"), /Skipped after the first failure:.*typecheck.*test.*build/);
  assert.equal(calls(fixture), "lint\n");
  assert.match(log(fixture), /Task failed-first: verification run/);
  assert.match(log(fixture), /Task verification.*failed/);
  assert.match(log(fixture), /\| Phase 0 \| Not started \|/);
});

test("malformed canonical log fails before checks or receipt writes and preserves bytes", (t) => {
  const fixture = createFixture();
  t.after(fixture.cleanup);
  const path = canonicalPath(fixture);
  mkdirSync(dirname(path), { recursive: true });
  const malformed = "# malformed canonical log\n| Phase 0 | Complete |\n";
  writeFileSync(path, malformed);
  const result = runVerifier(fixture, ["--task", "malformed"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /malformed phase, task, or activity structure/);
  assert.equal(readFileSync(path, "utf8"), malformed);
  assert.equal(calls(fixture), "");
  assert.equal(existsSync(receiptPath(fixture, "malformed")), false);
});

test("repeat runs append activity and untracked content changes fingerprint", (t) => {
  const fixture = createFixture();
  t.after(fixture.cleanup);
  const input = join(fixture.root, "input.txt");
  writeFileSync(input, "alpha");
  const first = runVerifier(fixture, ["--task", "repeat"]);
  assert.equal(first.status, 0, first.stderr);
  const firstFingerprint = fingerprintOf(receipt(fixture, "repeat"));
  assert.ok(firstFingerprint);
  const second = runVerifier(fixture, ["--task", "repeat"]);
  assert.equal(second.status, 0, second.stderr);
  const secondFingerprint = fingerprintOf(receipt(fixture, "repeat"));
  assert.equal(secondFingerprint, firstFingerprint);
  const activityAfterSecond = log(fixture);
  writeFileSync(input, "omega");
  const beforeContentChange = statSync(input);
  utimesSync(input, beforeContentChange.atime, beforeContentChange.mtime);
  const third = runVerifier(fixture, ["--task", "repeat"]);
  assert.equal(third.status, 0, third.stderr);
  const thirdFingerprint = fingerprintOf(receipt(fixture, "repeat"));
  assert.notEqual(thirdFingerprint, secondFingerprint);
  assert.equal((log(fixture).match(/Task repeat: verification run/g) ?? []).length, 3);
  assert.match(activityAfterSecond, /Task repeat: verification run/);
  assert.match(log(fixture), /\| Phase 1 \| Not started \|/);
});

test("private file contents and caller text stay out of evidence", (t) => {
  const fixture = createFixture();
  t.after(fixture.cleanup);
  const envPath = join(fixture.root, ".env.local");
  const credentialsPath = join(fixture.root, "CREDENTIALS.md");
  writeFileSync(envPath, "PRIVATE_SENTINEL_ONE");
  writeFileSync(credentialsPath, "CREDENTIALS_SENTINEL_ONE");
  const first = runVerifier(
    fixture,
    ["--task", "secret-safe", "--progress", "PRIVATE_PROGRESS_SENTINEL", "--next", "api_key=PRIVATE_NEXT_SENTINEL"],
  );
  assert.equal(first.status, 0, first.stderr);
  const firstFingerprint = fingerprintOf(receipt(fixture, "secret-safe"));
  assert.ok(firstFingerprint);
  const envStat = statSync(envPath);
  writeFileSync(envPath, "PRIVATE_SENTINEL_TWO");
  utimesSync(envPath, envStat.atime, envStat.mtime);
  const second = runVerifier(fixture, ["--task", "secret-safe"]);
  assert.equal(second.status, 0, second.stderr);
  const evidence = receipt(fixture, "secret-safe") + log(fixture);
  for (const secret of ["PRIVATE_SENTINEL_ONE", "PRIVATE_SENTINEL_TWO", "CREDENTIALS_SENTINEL_ONE", "PRIVATE_PROGRESS_SENTINEL", "PRIVATE_NEXT_SENTINEL"]) {
    assert.equal(evidence.includes(secret), false, "leaked " + secret);
  }
});

test("untracked filenames with whitespace and Unicode keep content-sensitive fingerprints", (t) => {
  const fixture = createFixture();
  t.after(fixture.cleanup);
  const input = join(fixture.root, " leading\n世界.txt");
  writeFileSync(input, "alpha");
  const first = runVerifier(fixture, ["--task", "unusual-filename"]);
  assert.equal(first.status, 0, first.stderr);
  const firstFingerprint = fingerprintOf(receipt(fixture, "unusual-filename"));
  assert.ok(firstFingerprint);
  const before = statSync(input);
  writeFileSync(input, "omega");
  utimesSync(input, before.atime, before.mtime);
  const second = runVerifier(fixture, ["--task", "unusual-filename"]);
  assert.equal(second.status, 0, second.stderr);
  assert.notEqual(fingerprintOf(receipt(fixture, "unusual-filename")), firstFingerprint);
});
