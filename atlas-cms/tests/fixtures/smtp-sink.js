'use strict';

const net = require('node:net');

/**
 * Small SMTP sink for provider compatibility tests.
 *
 * It implements only the commands Nodemailer needs for an unauthenticated,
 * plaintext local SMTP connection and records the SMTP envelope plus message.
 */
class SmtpSink {
  constructor({ rejectRecipients = false } = {}) {
    this.rejectRecipients = rejectRecipients;
    this.envelopes = [];
    this.messages = [];
    this.commands = [];
    this.connections = new Set();
    this.server = net.createServer((socket) => this.#handleConnection(socket));
  }

  async listen() {
    await new Promise((resolve, reject) => {
      const onError = (error) => {
        this.server.off('listening', onListening);
        reject(error);
      };
      const onListening = () => {
        this.server.off('error', onError);
        resolve();
      };
      this.server.once('error', onError);
      this.server.once('listening', onListening);
      this.server.listen(0, '127.0.0.1');
    });
    return this;
  }

  get port() {
    return this.server.address().port;
  }

  async close() {
    for (const socket of this.connections) {
      socket.destroy();
    }
    if (!this.server.listening) return;
    await new Promise((resolve, reject) => {
      this.server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  #handleConnection(socket) {
    this.connections.add(socket);
    socket.setEncoding('utf8');
    socket.setTimeout(5000, () => socket.destroy());
    socket.on('close', () => this.connections.delete(socket));

    let buffer = '';
    let state = 'commands';
    let envelope = null;
    let dataLines = [];

    const write = (line) => socket.write(`${line}\r\n`);
    const consumeLines = () => {
      let newline;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);

        if (state === 'data') {
          if (line === '.') {
            state = 'commands';
            this.envelopes.push(envelope);
            this.messages.push({ envelope, raw: dataLines.join('\r\n') });
            write('250 2.0.0 queued');
            envelope = null;
            dataLines = [];
          } else {
            dataLines.push(line.startsWith('..') ? line.slice(1) : line);
          }
          continue;
        }

        const command = line.match(/^([A-Za-z]+)(?:\s+(.*))?$/);
        const name = command?.[1]?.toUpperCase();
        const argument = command?.[2] ?? '';
        this.commands.push({ name, argument });

        switch (name) {
          case 'EHLO':
          case 'HELO':
            write('250-smtp-sink');
            write('250 8BITMIME');
            break;
          case 'MAIL':
            envelope = { from: argument, to: [] };
            write('250 2.1.0 sender ok');
            break;
          case 'RCPT':
            if (this.rejectRecipients) {
              write('550 5.1.1 recipient rejected');
            } else {
              envelope ??= { from: '', to: [] };
              envelope.to.push(argument);
              write('250 2.1.5 recipient ok');
            }
            break;
          case 'DATA':
            state = 'data';
            dataLines = [];
            write('354 end data with <CR><LF>.<CR><LF>');
            break;
          case 'RSET':
            envelope = null;
            dataLines = [];
            write('250 2.0.0 reset');
            break;
          case 'NOOP':
            write('250 2.0.0 ok');
            break;
          case 'QUIT':
            write('221 2.0.0 bye');
            socket.end();
            break;
          default:
            write('250 2.0.0 ok');
            break;
        }
      }
    };

    socket.on('data', (chunk) => {
      buffer += chunk;
      consumeLines();
    });
    write('220 smtp-sink ESMTP ready');
  }
}

module.exports = { SmtpSink };
