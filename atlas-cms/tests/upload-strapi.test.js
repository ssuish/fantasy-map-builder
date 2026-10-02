'use strict';

// The fixture app has no .env file. Point Strapi's dotenv loader at a nonexistent
// path before importing the framework so this test cannot read the repository's
// private environment while booting.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');

const fixtureAppDir = path.join(__dirname, 'fixtures', 'strapi-upload-app');
const testEnvDir = path.join(os.tmpdir(), `atlas-cms-no-env-${process.pid}`);
process.env.ENV_PATH = testEnvDir;
process.env.NODE_ENV = 'test';
process.env.APP_KEYS = 'compatibility-test-app-key-1,compatibility-test-app-key-2';
process.env.ADMIN_JWT_SECRET = 'compatibility-test-admin-jwt-secret';
process.env.API_TOKEN_SALT = 'compatibility-test-api-token-salt';
process.env.TRANSFER_TOKEN_SALT = 'compatibility-test-transfer-token-salt';
process.env.ENCRYPTION_KEY = 'compatibility-test-encryption-key';
process.env.JWT_SECRET = 'compatibility-test-jwt-secret';
process.env.PORT = '0';
process.env.ATLAS_PRODUCTION_PLUGINS_CONFIG = path.join(__dirname, '..', 'dist', 'config', 'plugins.js');
process.env.ATLAS_PRODUCTION_UPLOAD_EXTENSION = path.join(__dirname, '..', 'dist', 'src', 'extensions', 'upload', 'strapi-server.js');

// npm workspaces may dedupe @strapi/core to the repository root while keeping
// @strapi/strapi under atlas-cms. Preserve the app's normal module search path
// so Strapi can discover its internal plugins during this isolated boot.
const moduleLoader = require('node:module');
process.env.NODE_PATH = [path.join(__dirname, '..', 'node_modules'), process.env.NODE_PATH]
  .filter(Boolean)
  .join(path.delimiter);
moduleLoader.Module._initPaths();

const { createStrapi } = require('@strapi/strapi');
const sharp = require('sharp');
const strapiEntry = require.resolve('@strapi/strapi');
const uploadPackage = path.dirname(
  require.resolve('@strapi/upload/package.json', { paths: [path.dirname(strapiEntry)] })
);
const { validateFile } = require(path.join(uploadPackage, 'dist/server/utils/mime-validation.js'));

let app;
let tempRoot;
let isolatedAppDir;
let baseUrl;
let contentApiAccessKey;

const fixtureFile = (name) => path.join(tempRoot, name);

before(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-cms-provider-'));
  isolatedAppDir = path.join(tempRoot, 'app');
  await fs.cp(fixtureAppDir, isolatedAppDir, { recursive: true });
  process.env.DATABASE_FILENAME = fixtureFile('data.db');

  app = createStrapi({
    appDir: isolatedAppDir,
    distDir: isolatedAppDir,
    autoReload: false,
    serveAdminPanel: false,
  });
  await app.load();
  await app.server.listen();
  const address = app.server.httpServer.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
  const token = await app.service('admin::api-token').create({
    name: 'isolated upload compatibility token',
    kind: 'content-api',
    type: 'custom',
    permissions: ['plugin::upload.content-api.upload'],
    lifespan: null,
  });
  contentApiAccessKey = token.accessKey;
});

after(async () => {
  await app?.destroy();
  await fs.rm(tempRoot, { recursive: true, force: true });
});

test('booted isolated Strapi upload API denies anonymous file access', async () => {
  const readResponse = await fetch(`${baseUrl}/api/upload/files`);
  assert.ok([401, 403].includes(readResponse.status), `expected protected read route, got ${readResponse.status}`);

  const form = new FormData();
  form.append(
    'files',
    new Blob([Buffer.from('not an image')], { type: 'image/png' }),
    'anonymous.png'
  );
  const writeResponse = await fetch(`${baseUrl}/api/upload`, { method: 'POST', body: form });
  assert.ok([401, 403].includes(writeResponse.status), `expected protected upload route, got ${writeResponse.status}`);

  const allowed = new FormData();
  allowed.append(
    'files',
    new Blob([
      Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
    ], { type: 'image/png' }),
    'token-upload.png'
  );
  const allowedResponse = await fetch(`${baseUrl}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${contentApiAccessKey}` },
    body: allowed,
  });
  assert.equal(allowedResponse.status, 201);
  const [uploaded] = await allowedResponse.json();
  await app.plugin('upload').service('upload').remove(uploaded);

  for (const [name, mime, body] of [
    ['token-upload.svg', 'image/svg+xml', '<svg><script>alert(1)</script></svg>'],
    ['token-upload.exe', 'application/vnd.microsoft.portable-executable', 'MZ\u0000\u0000'],
  ]) {
    const denied = new FormData();
    denied.append('files', new Blob([body], { type: mime }), name);
    const deniedResponse = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${contentApiAccessKey}` },
      body: denied,
    });
    assert.equal(deniedResponse.status, 400, `expected MIME rejection for ${name}`);
  }
});

test('booted Strapi upload service stores an image and generated derived variants', async () => {
  const source = fixtureFile('wide.png');
  await sharp({
    create: {
      width: 1_200,
      height: 900,
      channels: 4,
      background: { r: 38, g: 62, b: 94, alpha: 1 },
    },
  })
    .png()
    .toFile(source);

  const { size } = await fs.stat(source);
  const uploadService = app.plugin('upload').service('upload');
  await uploadService.setSettings({ responsiveDimensions: true, sizeOptimization: false, autoOrientation: false });
  const [uploaded] = await uploadService.upload({
    data: {},
    files: {
      filepath: source,
      originalFilename: 'wide.png',
      mimetype: 'image/png',
      size,
    },
  });

  try {
    assert.equal(uploaded.mime, 'image/png');
    assert.equal(uploaded.provider, 'local');
    assert.ok(uploaded.width >= 1_200);
    assert.ok(uploaded.height >= 900);
    assert.ok(uploaded.formats?.thumbnail, 'thumbnail variant missing');
    assert.ok(uploaded.formats?.small, 'small responsive variant missing');
    assert.ok(uploaded.formats?.medium, 'medium responsive variant missing');
    const uploadsDirectory = path.join(isolatedAppDir, 'public', 'uploads');
    assert.ok(await fs.stat(path.join(uploadsDirectory, `${uploaded.hash}${uploaded.ext}`)));
    assert.ok(await fs.stat(path.join(uploadsDirectory, `${uploaded.formats.thumbnail.hash}${uploaded.formats.thumbnail.ext}`)));
  } finally {
    await uploadService.remove(uploaded);
  }
});

test('booted Strapi upload validation denies SVG and executable content and rejects malformed images', async () => {
  const config = app.config.get('plugin::upload.security');
  const svgPath = fixtureFile('payload.svg');
  const executablePath = fixtureFile('payload.exe');
  const malformedPath = fixtureFile('malformed.png');
  await fs.writeFile(svgPath, '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  await fs.writeFile(executablePath, 'MZ\u0000\u0000not executable in this test');
  await fs.writeFile(malformedPath, 'this is not a PNG');

  const uploadSecurity = (filePath, originalFilename, mimetype) =>
    validateFile({ filepath: filePath, originalFilename, mimetype }, config, app);

  const svg = await uploadSecurity(svgPath, 'payload.svg', 'image/svg+xml');
  assert.equal(svg.isValid, false);
  assert.match(svg.error.message, /not allowed/i);

  const executable = await uploadSecurity(
    executablePath,
    'payload.exe',
    'application/vnd.microsoft.portable-executable'
  );
  assert.equal(executable.isValid, false);
  assert.match(executable.error.message, /not allowed/i);

  const imageManipulation = app.plugin('upload').service('image-manipulation');
  assert.equal(
    await imageManipulation.isFaultyImage({ filepath: malformedPath }),
    true,
    'malformed image must be detected before image processing'
  );
});
