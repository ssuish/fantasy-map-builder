'use strict';

// Keep Strapi dotenv pointed at a missing path before importing the framework.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { test, before, after } = require('node:test');

const { SmtpSink } = require('./fixtures/smtp-sink');

const fixtureAppDir = path.join(__dirname, 'fixtures', 'strapi-upload-app');
process.env.ENV_PATH = path.join(os.tmpdir(), `atlas-cms-auth-no-env-${process.pid}`);
process.env.NODE_ENV = 'test';
process.env.APP_KEYS = 'auth-test-app-key-1,auth-test-app-key-2';
process.env.ADMIN_JWT_SECRET = 'auth-test-admin-jwt-secret';
process.env.API_TOKEN_SALT = 'auth-test-api-token-salt';
process.env.TRANSFER_TOKEN_SALT = 'auth-test-transfer-token-salt';
process.env.ENCRYPTION_KEY = 'auth-test-encryption-key';
process.env.JWT_SECRET = 'auth-test-jwt-secret';
process.env.PORT = '0';
process.env.SMTP_HOST = '127.0.0.1';
process.env.EMAIL_DEFAULT_FROM = 'Atlas <no-reply@example.test>';
process.env.EMAIL_DEFAULT_REPLY_TO = 'support@example.test';
process.env.ATLAS_PRODUCTION_PLUGINS_CONFIG = path.join(__dirname, '..', 'dist', 'config', 'plugins.js');
process.env.ATLAS_PRODUCTION_UPLOAD_EXTENSION = path.join(__dirname, '..', 'dist', 'src', 'extensions', 'upload', 'strapi-server.js');

const moduleLoader = require('node:module');
process.env.NODE_PATH = [path.join(__dirname, '..', 'node_modules'), process.env.NODE_PATH]
  .filter(Boolean)
  .join(path.delimiter);
moduleLoader.Module._initPaths();

const { createStrapi } = require('@strapi/strapi');
const sharp = require('sharp');

let app;
let tempRoot;
let baseUrl;
let smtp;
let authenticatedRole;
let uploadRole;
let noUploadUser;
let uploadUser;
let failureUser;
let blockedUser;
let rateUser;
let noUploadToken;
let uploadToken;

const jsonRequest = (url, body, options = {}) => fetch(`${baseUrl}${url}`, {
  signal: AbortSignal.timeout(10_000),
  ...options,
  headers: {
    'content-type': 'application/json',
    ...(options.headers || {}),
  },
  body: JSON.stringify(body),
});

async function login(user) {
  const response = await jsonRequest('/api/auth/local', {
    identifier: user.email,
    password: user.password,
  }, { method: 'POST' });
  const payload = await response.text();
  assert.equal(response.status, 200, payload);
  return JSON.parse(payload).jwt;
}

async function uploadWithToken(token, fileName, mimeType, buffer) {
  const form = new FormData();
  form.append('files', new Blob([buffer], { type: mimeType }), fileName);
  return fetch(`${baseUrl}/api/upload`, {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}

function mediaCount() {
  return app.db.query('plugin::upload.file').count();
}

function clearSmtp() {
  smtp.messages.length = 0;
  smtp.envelopes.length = 0;
  smtp.commands.length = 0;
}

before(async () => {
  smtp = await new SmtpSink().listen();
  process.env.SMTP_PORT = String(smtp.port);
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-cms-auth-'));
  const isolatedAppDir = path.join(tempRoot, 'app');
  await fs.cp(fixtureAppDir, isolatedAppDir, { recursive: true });
  process.env.DATABASE_FILENAME = path.join(tempRoot, 'data.db');

  app = createStrapi({
    appDir: isolatedAppDir,
    distDir: isolatedAppDir,
    autoReload: false,
    serveAdminPanel: false,
  });
  await app.load();
  await app.server.listen();
  baseUrl = `http://127.0.0.1:${app.server.httpServer.address().port}`;
  assert.equal(app.config.get('plugin::users-permissions.jwtManagement'), 'refresh');
  assert.equal(app.config.get('plugin::users-permissions.sessions.httpOnly'), true);

  authenticatedRole = await app.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
  uploadRole = await app.db.query('plugin::users-permissions.role').create({
    data: { name: 'Upload Role', description: 'Scoped upload compatibility role', type: 'upload-role' },
  });
  await app.db.query('plugin::users-permissions.permission').create({
    data: { action: 'plugin::upload.content-api.upload', role: uploadRole.id },
  });

  const userService = app.service('plugin::users-permissions.user');
  noUploadUser = await userService.add({
    username: 'no-upload-user',
    email: 'no-upload@example.test',
    password: 'NoUpload-password-1',
    provider: 'local',
    confirmed: true,
    role: authenticatedRole.id,
  });
  uploadUser = await userService.add({
    username: 'upload-user',
    email: 'upload@example.test',
    password: 'Upload-password-1',
    provider: 'local',
    confirmed: true,
    role: uploadRole.id,
  });
  failureUser = await userService.add({
    username: 'failure-user',
    email: 'failure@example.test',
    password: 'Failure-password-1',
    provider: 'local',
    confirmed: true,
    role: authenticatedRole.id,
  });
  blockedUser = await userService.add({
    username: 'blocked-user',
    email: 'blocked@example.test',
    password: 'Blocked-password-1',
    provider: 'local',
    confirmed: true,
    blocked: true,
    role: authenticatedRole.id,
  });
  rateUser = await userService.add({
    username: 'rate-user',
    email: 'rate@example.test',
    password: 'Rate-password-1',
    provider: 'local',
    confirmed: true,
    role: authenticatedRole.id,
  });
  noUploadUser.password = 'NoUpload-password-1';
  uploadUser.password = 'Upload-password-1';
  noUploadToken = await login(noUploadUser);
  uploadToken = await login(uploadUser);
});

after(async () => {
  try {
    await app?.destroy();
  } finally {
    try {
      await smtp?.close();
    } finally {
      if (tempRoot) await fs.rm(tempRoot, { recursive: true, force: true });
    }
  }
});

test('anonymous and ordinary users cannot upload, scoped upload role can upload variants, unrelated list stays denied', async () => {
  const widePng = await sharp({
    create: {
      width: 1_200,
      height: 900,
      channels: 4,
      background: { r: 38, g: 62, b: 94, alpha: 1 },
    },
  }).png().toBuffer();
  const before = await mediaCount();

  const anonymous = await uploadWithToken('', 'anonymous.png', 'image/png', widePng);
  assert.ok([401, 403].includes(anonymous.status));
  assert.equal(await mediaCount(), before);

  const denied = await uploadWithToken(noUploadToken, 'denied.png', 'image/png', widePng);
  assert.equal(denied.status, 403);
  assert.equal(await mediaCount(), before);

  const uploadedResponse = await uploadWithToken(uploadToken, 'wide.png', 'image/png', widePng);
  const uploadedPayload = await uploadedResponse.text();
  assert.equal(uploadedResponse.status, 201, uploadedPayload);
  const [uploaded] = JSON.parse(uploadedPayload);
  assert.ok(uploaded.formats?.thumbnail);
  assert.ok(uploaded.formats?.small);
  assert.ok(uploaded.formats?.medium);
  assert.equal((await mediaCount()) - before, 1);

  const listResponse = await fetch(`${baseUrl}/api/upload/files`, {
    headers: { Authorization: `Bearer ${uploadToken}` },
  });
  assert.equal(listResponse.status, 403);
  await app.plugin('upload').service('upload').remove(uploaded);
  assert.equal(await mediaCount(), before);
});

test('authenticated MIME rejection leaves no upload record', async () => {
  const before = await mediaCount();
  for (const [fileName, mimeType, body] of [
    ['blocked.svg', 'image/svg+xml', '<svg><script>alert(1)</script></svg>'],
    ['blocked.exe', 'application/vnd.microsoft.portable-executable', 'MZ\u0000\u0000'],
    ['malformed.png', 'image/png', 'not a PNG image'],
  ]) {
    const response = await uploadWithToken(uploadToken, fileName, mimeType, Buffer.from(body));
    assert.equal(response.status, 400, `${fileName}: ${await response.text()}`);
  }
  assert.equal(await mediaCount(), before);
});

test('authorized non-image text keeps its allowed upload path', async () => {
  const before = await mediaCount();
  const response = await uploadWithToken(uploadToken, 'notes.txt', 'text/plain', Buffer.from('legitimate notes'));
  assert.equal(response.status, 201);
  const [uploaded] = await response.json();
  try {
    assert.equal(uploaded.mime, 'text/plain');
    assert.equal(await mediaCount(), before + 1);
  } finally {
    await app.plugin('upload').service('upload').remove(uploaded);
  }
  assert.equal(await mediaCount(), before);
});

test('forgot-password uses stored recipient, suppresses unknown mail, and rejects extra fields', async () => {
  clearSmtp();
  const valid = await jsonRequest('/api/auth/forgot-password', { email: uploadUser.email }, { method: 'POST' });
  assert.equal(valid.status, 200);
  const expectedResponse = await valid.json();
  assert.deepEqual(expectedResponse, { ok: true });
  assert.equal(smtp.messages.length, 1);
  assert.deepEqual(smtp.messages[0].envelope.to, ['TO:<upload@example.test>']);
  assert.doesNotMatch(smtp.messages[0].raw, /attacker@example\.test/);

  clearSmtp();
  const unknown = await jsonRequest('/api/auth/forgot-password', { email: 'unknown@example.test' }, { method: 'POST' });
  assert.equal(unknown.status, 200);
  assert.deepEqual(await unknown.json(), expectedResponse);
  assert.equal(smtp.messages.length, 0);

  const blocked = await jsonRequest('/api/auth/forgot-password', { email: blockedUser.email }, { method: 'POST' });
  assert.equal(blocked.status, 200);
  assert.deepEqual(await blocked.json(), expectedResponse);
  assert.equal(smtp.messages.length, 0);

  const extra = await jsonRequest('/api/auth/forgot-password', {
    email: uploadUser.email,
    to: 'attacker@example.test',
    cc: 'cc-attacker@example.test',
    bcc: 'bcc-attacker@example.test',
    replyTo: 'reply-attacker@example.test',
    headers: { 'x-attacker': 'true' },
    attachments: [{ href: 'http://127.0.0.1:9/never-read' }],
  }, { method: 'POST' });
  assert.equal(extra.status, 400);
  assert.equal(smtp.messages.length, 0);
});

test('forgot-password project limit is five requests per identifier and sixth is 429 without extra mail', async () => {
  clearSmtp();
  const identifier = rateUser.email;
  const responses = [];
  for (let index = 0; index < 6; index += 1) {
    responses.push(await jsonRequest('/api/auth/forgot-password', { email: identifier }, { method: 'POST' }));
  }
  assert.deepEqual(responses.slice(0, 5).map((response) => response.status), [200, 200, 200, 200, 200]);
  assert.equal(responses[5].status, 429);
  assert.equal(smtp.messages.length, 5);
});

test('admin email test route denies anonymous and ordinary user access', async () => {
  const deliveriesBefore = smtp.messages.length;
  const body = { to: 'recipient@example.test', subject: 'test', text: 'test' };
  const anonymous = await jsonRequest('/email/test', body, { method: 'POST' });
  assert.ok([401, 403].includes(anonymous.status));
  const ordinary = await jsonRequest('/email/test', body, {
    method: 'POST',
    headers: { Authorization: `Bearer ${noUploadToken}` },
  });
  assert.ok([401, 403].includes(ordinary.status));
  assert.equal(smtp.messages.length, deliveriesBefore);
});

test('forgot-password records reset token before reporting SMTP failure', async () => {
  clearSmtp();
  const before = await app.db.query('plugin::users-permissions.user').findOne({
    where: { id: failureUser.id },
    select: ['resetPasswordToken'],
  });
  assert.equal(before.resetPasswordToken, null);
  smtp.rejectRecipients = true;
  let response;
  try {
    response = await jsonRequest('/api/auth/forgot-password', { email: failureUser.email }, { method: 'POST' });
  } finally {
    smtp.rejectRecipients = false;
  }
  assert.equal(response.status, 500);
  const afterFailure = await app.db.query('plugin::users-permissions.user').findOne({
    where: { id: failureUser.id },
    select: ['resetPasswordToken'],
  });
  assert.ok(afterFailure.resetPasswordToken, 'reset token must persist before SMTP send failure');
  assert.equal(smtp.messages.length, 0);
});
