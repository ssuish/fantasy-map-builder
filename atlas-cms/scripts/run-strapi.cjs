'use strict';

const path = require('node:path');
const { spawn } = require('node:child_process');

const appRoot = path.resolve(__dirname, '..');
const appNodeModules = path.join(appRoot, 'node_modules');

function resolveStrapiCli() {
  const packageJsonPath = require.resolve('@strapi/strapi/package.json', {
    paths: [appRoot],
  });
  const packageRoot = path.dirname(packageJsonPath);
  const packageJson = require(packageJsonPath);
  const bin = typeof packageJson.bin === 'string' ? packageJson.bin : packageJson.bin?.strapi;

  if (!bin) {
    throw new Error('Installed @strapi/strapi package does not expose a strapi CLI binary');
  }

  return path.resolve(packageRoot, bin);
}

function buildEnvironment() {
  const nodePath = [appNodeModules, process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
  return { ...process.env, NODE_PATH: nodePath };
}

function forwardSignals(child) {
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  let childExited = false;

  const handlers = new Map(
    signals.map((signal) => [
      signal,
      () => {
        if (!childExited) child.kill(signal);
      },
    ])
  );
  for (const [signal, handler] of handlers) process.on(signal, handler);

  return () => {
    childExited = true;
    for (const [signal, handler] of handlers) process.removeListener(signal, handler);
  };
}

function run(args) {
  const cliPath = resolveStrapiCli();
  const child = spawn(process.execPath, [cliPath, ...args], {
    cwd: appRoot,
    env: buildEnvironment(),
    stdio: 'inherit',
    windowsHide: false,
  });
  const removeSignalHandlers = forwardSignals(child);

  child.once('error', (error) => {
    removeSignalHandlers();
    console.error(`Unable to start Strapi CLI: ${error.message}`);
    process.exitCode = 1;
  });
  child.once('exit', (code, signal) => {
    removeSignalHandlers();
    if (signal) {
      process.exitCode = 128 + (signal === 'SIGINT' ? 2 : signal === 'SIGTERM' ? 15 : 1);
    } else {
      process.exitCode = code ?? 1;
    }
  });
}

try {
  run(process.argv.slice(2));
} catch (error) {
  console.error(`Unable to resolve Strapi CLI: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
