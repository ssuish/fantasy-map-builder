'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const nodemailer = require('nodemailer');

test('Nodemailer parser preserves quoted local parts and does not extract quoted display text', () => {
  const addressParser = require('nodemailer/lib/addressparser');

  assert.equal(
    addressParser('"user@untrusted.test"@trusted.test')[0].address,
    '"user@untrusted.test"@trusted.test'
  );
  assert.notEqual(addressParser('"display attacker@untrusted.test"')[0].address, 'attacker@untrusted.test');
});

test('Nodemailer deeply nested parser work is bounded in a separate process', () => {
  const parserRun = spawnSync(
    process.execPath,
    [
      '-e',
      "const parse = require('nodemailer/lib/addressparser'); const nested = `root:${'nested:'.repeat(1000)}victim@example.test${';'.repeat(1001)}`; if (!Array.isArray(parse(nested))) process.exit(2);",
    ],
    {
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        NODE_PATH: [path.join(path.resolve(__dirname, '..'), 'node_modules'), process.env.NODE_PATH]
          .filter(Boolean)
          .join(path.delimiter),
      },
      timeout: 1_000,
      encoding: 'utf8',
    }
  );
  assert.equal(parserRun.error, undefined, parserRun.error?.message);
  assert.equal(parserRun.status, 0, parserRun.stderr);
});

test('Nodemailer does not turn CRLF in untrusted address fields into new headers', async () => {
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
  const info = await transport.sendMail({
    from: 'sender@example.test',
    to: 'victim@example.test\r\nBcc: injected@example.test',
    replyTo: 'reply@example.test\r\nBcc: injected@example.test',
    subject: 'subject\r\nBcc: injected@example.test',
    text: 'body',
  });
  const raw = info.message.toString();
  assert.doesNotMatch(raw, /^Bcc:/im);
  assert.match(raw, /^To:/m);
  assert.match(raw, /^Reply-To:/m);
  assert.match(raw, /^Subject:/m);
});
