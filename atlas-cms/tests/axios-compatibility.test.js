'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const { test } = require('node:test');
const axios = require('axios');

test('Axios request controls remain usable for CMS-style JSON and timeout handling', async () => {
  const server = http.createServer((request, response) => {
    if (request.url?.startsWith('/json')) {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ ok: true, query: request.url }));
      return;
    }
    if (request.url === '/slow') {
      setTimeout(() => response.end('late'), 1_000).unref?.();
      return;
    }
    response.statusCode = 404;
    response.end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const client = axios.create({
      baseURL: `http://127.0.0.1:${server.address().port}`,
      timeout: 200,
      validateStatus: (status) => status < 500,
    });
    const response = await client.get('/json', { params: { page: 1 } });
    assert.equal(response.status, 200);
    assert.equal(response.data.ok, true);
    assert.match(response.data.query, /page=1/);

    await assert.rejects(client.get('/slow'), (error) => {
      assert.ok(error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT');
      return true;
    });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
