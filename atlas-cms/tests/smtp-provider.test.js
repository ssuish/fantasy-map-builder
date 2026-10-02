'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const nodemailer = require('nodemailer');
const sendmailProvider = require('@strapi/provider-email-sendmail');

const { HttpSink } = require('./fixtures/http-sink');
const { withSmtp } = require('./fixtures/with-smtp');

const withDeadline = async (promise, milliseconds, label) => {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} exceeded ${milliseconds}ms`)), milliseconds);
        timer.unref?.();
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

test('Sendmail init/send delivers headers and all envelope recipients to local SMTP', async () => {
  await withSmtp({}, async (sink) => {
    const provider = sendmailProvider.init(
      { devHost: '127.0.0.1', devPort: sink.port, silent: true },
      { defaultFrom: 'Atlas <sender@example.test>', defaultReplyTo: 'reply@example.test' }
    );
    await withDeadline(provider.send({
      to: 'To Person <to@example.test>',
      cc: 'Copy Person <copy@example.test>',
      bcc: 'hidden@example.test',
      subject: 'Provider compatibility',
      text: 'plain body',
      html: '<p>html body</p>',
    }), 2_000, 'SMTP delivery');

    assert.equal(sink.messages.length, 1);
    const [{ envelope, raw }] = sink.messages;
    assert.equal(envelope.from, 'FROM:<sender@example.test>');
    assert.deepEqual(envelope.to.sort(), [
      'TO:<copy@example.test>',
      'TO:<hidden@example.test>',
      'TO:<to@example.test>',
    ]);
    assert.match(raw, /^From: Atlas <sender@example.test>$/m);
    assert.match(raw, /^To: To Person <to@example.test>$/m);
    assert.match(raw, /^Cc: Copy Person <copy@example.test>$/m);
    assert.match(raw, /^Reply-To: reply@example.test$/m);
    assert.doesNotMatch(raw, /^Bcc:/im);
  });
});

test('Sendmail reports SMTP recipient failure without a completed message', async () => {
  await withSmtp({ rejectRecipients: true }, async (sink) => {
    const provider = sendmailProvider.init(
      { devHost: '127.0.0.1', devPort: sink.port, silent: true },
      { defaultFrom: 'sender@example.test' }
    );
    await assert.rejects(withDeadline(provider.send({
      to: 'recipient@example.test',
      subject: 'must fail',
      text: 'not delivered',
    }), 2_000, 'failed SMTP delivery'), /Failed to deliver|failed to send|recipient rejected/i);
    assert.equal(sink.messages.length, 0);
  });
});

test('Sendmail rejects local file attachments and force-disables caller false file flags', async () => {
  await withSmtp({}, async (sink) => {
    const provider = sendmailProvider.init(
      { devHost: '127.0.0.1', devPort: sink.port, silent: true },
      { defaultFrom: 'sender@example.test' }
    );
    await assert.rejects(withDeadline(provider.send({
      to: 'recipient@example.test',
      subject: 'file policy',
      text: 'body',
      disableFileAccess: false,
      attachments: [{ filename: 'secret.txt', path: path.join(__dirname, 'fixtures', 'secret.txt') }],
    }), 2_000, 'file attachment rejection'), /Failed to deliver|File access rejected/i);
    assert.equal(sink.messages.length, 0);
  });
});

test('Sendmail blocks reachable URL attachment and makes zero HTTP requests', async () => {
  const http = await new HttpSink().listen();
  try {
    await withSmtp({}, async (smtp) => {
      const provider = sendmailProvider.init(
        { devHost: '127.0.0.1', devPort: smtp.port, silent: true },
        { defaultFrom: 'sender@example.test' }
      );
      await assert.rejects(withDeadline(provider.send({
        to: 'recipient@example.test',
        subject: 'URL policy',
        text: 'body',
        disableUrlAccess: false,
        attachments: [{ filename: 'remote.txt', href: http.url }],
      }), 2_000, 'URL attachment rejection'), /Failed to deliver|Url access rejected|URL access rejected/i);
      assert.equal(http.requests.length, 0);
      assert.equal(smtp.messages.length, 0);
    });
  } finally {
    await http.close();
  }
});

test('direct Nodemailer positive control fetches a reachable URL attachment when allowed', async () => {
  const http = await new HttpSink({ body: 'positive attachment body' }).listen();
  try {
    const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
    try {
      const info = await withDeadline(transport.sendMail({
        from: 'sender@example.test',
        to: 'recipient@example.test',
        subject: 'positive URL control',
        text: 'body',
        disableUrlAccess: false,
        attachments: [{ filename: 'remote.txt', href: http.url }],
      }), 2_000, 'positive URL fetch');
      assert.equal(http.requests.length, 1);
      assert.match(info.message.toString(), /cG9zaXRpdmUgYXR0YWNobWVudCBib2R5/);
    } finally {
      transport.close?.();
    }
  } finally {
    await http.close();
  }
});
