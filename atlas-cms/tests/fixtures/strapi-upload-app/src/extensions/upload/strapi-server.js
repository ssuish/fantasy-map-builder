'use strict';

const extensionPath = process.env.ATLAS_PRODUCTION_UPLOAD_EXTENSION;
if (!extensionPath) {
  throw new Error('ATLAS_PRODUCTION_UPLOAD_EXTENSION is required by the upload compatibility fixture');
}

module.exports = require(extensionPath).default;
