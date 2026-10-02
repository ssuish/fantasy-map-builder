'use strict';

const http = require('node:http');

class HttpSink {
  constructor({ body = 'local attachment body', statusCode = 200 } = {}) {
    this.body = body;
    this.statusCode = statusCode;
    this.requests = [];
    this.server = http.createServer((request, response) => {
      const chunks = [];
      request.on('data', (chunk) => chunks.push(chunk));
      request.on('end', () => {
        this.requests.push({
          method: request.method,
          url: request.url,
          headers: request.headers,
          body: Buffer.concat(chunks),
        });
        response.statusCode = this.statusCode;
        response.setHeader('content-type', 'text/plain');
        response.end(this.body);
      });
    });
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

  get url() {
    return `http://127.0.0.1:${this.port}/attachment.txt`;
  }

  async close() {
    if (!this.server.listening) return;
    await new Promise((resolve, reject) => {
      this.server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

module.exports = { HttpSink };
