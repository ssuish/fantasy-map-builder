'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { test } = require('node:test');

const appRoot = path.resolve(__dirname, '..');
const launcherPath = path.join(appRoot, 'scripts', 'run-strapi.cjs');

async function stopChildBounded(child, closePromise) {
  let closed = false;
  closePromise.then(() => { closed = true; }, () => { closed = true; });
  const kill = (signal) => {
    try {
      if (process.platform === 'win32') child.kill(signal);
      else process.kill(-child.pid, signal);
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  };
  if (!closed) kill('SIGTERM');
  let graceTimer;
  try {
    await Promise.race([
      closePromise,
      new Promise((resolve) => {
        graceTimer = setTimeout(resolve, 2_000);
        graceTimer.unref?.();
      }),
    ]);
  } finally {
    clearTimeout(graceTimer);
  }
  if (!closed) kill('SIGKILL');
  const killTimeout = Symbol('kill-timeout');
  let killTimer;
  const killedResult = await Promise.race([
    closePromise.catch(() => undefined),
    new Promise((resolve) => {
      killTimer = setTimeout(() => resolve(killTimeout), 2_000);
      killTimer.unref?.();
    }),
  ]).finally(() => clearTimeout(killTimer));
  if (killedResult === killTimeout) throw new Error('Strapi launcher child did not exit after SIGKILL');
}

test('launcher resolves Strapi from the app workspace and boots with hoisted dependencies', { timeout: 45_000 }, async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-cms-launcher-'));
  const databasePath = path.join(tempRoot, 'data.db');
  const noNodePath = path.join(tempRoot, 'does-not-contain-node-modules');
  const environment = {
    ...process.env,
    ENV_PATH: path.join(tempRoot, 'no-private-env-file'),
    NODE_ENV: 'test',
    NODE_PATH: noNodePath,
    HOST: '127.0.0.1',
    PORT: '0',
    APP_KEYS: 'launcher-test-key-1,launcher-test-key-2',
    ADMIN_JWT_SECRET: 'launcher-admin-secret',
    API_TOKEN_SALT: 'launcher-api-salt',
    TRANSFER_TOKEN_SALT: 'launcher-transfer-salt',
    ENCRYPTION_KEY: 'launcher-encryption-key',
    JWT_SECRET: 'launcher-jwt-secret',
    DATABASE_CLIENT: 'sqlite',
    // The production config resolves DATABASE_FILENAME relative to the app's
    // config directory, so pass a relative path to keep the SQLite file in tmp.
    DATABASE_FILENAME: path.relative(appRoot, databasePath),
  };
  const child = spawn(process.execPath, [launcherPath, 'start'], {
    cwd: appRoot,
    env: environment,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: false,
    detached: process.platform !== 'win32',
  });

  let output = '';
  let started = false;
  let stopping = false;
  let timer;
  const collect = (chunk) => {
    output += chunk.toString();
    if (!stopping && output.includes('Strapi started successfully')) {
      started = true;
      stopping = true;
      child.kill('SIGTERM');
    }
  };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);

  let resolveClose;
  let rejectClose;
  const closePromise = new Promise((resolve, reject) => {
    resolveClose = resolve;
    rejectClose = reject;
  });
  child.once('error', rejectClose);
  child.once('close', (code, signal) => resolveClose({ code, signal }));

  try {
    const result = await new Promise((resolve, reject) => {
      timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Strapi launcher did not boot within 30s.\n${output}`));
      }, 30_000);
      timer.unref?.();
      closePromise.then(resolve, reject);
    });

    assert.equal(started, true, `launcher did not reach Strapi startup.\n${output}`);
    const plainOutput = output.replace(/\u001b\[[0-9;]*m/g, '');
    assert.match(plainOutput, /Version\s+│\s+5\.56\.0/);
    assert.ok(
      result.signal === 'SIGTERM' || result.code === 143 || result.code === 0,
      `unexpected launcher exit: ${JSON.stringify(result)}`
    );
  } finally {
    clearTimeout(timer);
    try {
      await stopChildBounded(child, closePromise);
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  }
});
