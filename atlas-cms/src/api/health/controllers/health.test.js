'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const healthController = require('../../../../dist/src/api/health/controllers/health').default;
const healthRoutes = require('../../../../dist/src/api/health/routes/health').default;

test('health controller returns a minimal readiness response', () => {
  const ctx = {};

  healthController.check(ctx);

  assert.equal(ctx.status, 200);
  assert.deepEqual(ctx.body, { status: 'ok' });
});

test('health route is available without authentication', () => {
  const [route] = healthRoutes.routes;

  assert.equal(route.method, 'GET');
  assert.equal(route.path, '/health');
  assert.equal(route.config.auth, false);
});
