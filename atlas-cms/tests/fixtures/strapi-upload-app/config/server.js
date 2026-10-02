'use strict';

module.exports = ({ env }) => ({
  host: '127.0.0.1',
  port: env.int('PORT', 0),
  app: { keys: env.array('APP_KEYS') },
});
