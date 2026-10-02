'use strict';

const productionPluginsPath = process.env.ATLAS_PRODUCTION_PLUGINS_CONFIG;
if (!productionPluginsPath) {
  throw new Error('ATLAS_PRODUCTION_PLUGINS_CONFIG is required by the upload compatibility fixture');
}

const productionConfig = require(productionPluginsPath).default;

module.exports = ({ env }) => {
  const config = productionConfig({ env });
  return {
    ...config,
    upload: {
      ...config.upload,
      config: {
        ...config.upload?.config,
        provider: 'local',
        providerOptions: {},
        sizeLimit: 1_000_000,
      },
    },
    email: {
      config: {
        provider: 'sendmail',
        providerOptions: {
          devHost: env('SMTP_HOST', '127.0.0.1'),
          devPort: env.int('SMTP_PORT', -1),
          silent: true,
        },
        settings: {
          defaultFrom: env('EMAIL_DEFAULT_FROM', 'Atlas <no-reply@example.test>'),
          defaultReplyTo: env('EMAIL_DEFAULT_REPLY_TO', 'support@example.test'),
        },
      },
    },
  };
};
