'use strict';

const { SmtpSink } = require('./smtp-sink');

async function withSmtp(options, callback) {
  const sink = await new SmtpSink(options).listen();
  try {
    return await callback(sink);
  } finally {
    await sink.close();
  }
}

module.exports = { withSmtp };
