'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

function packageVersion(name, from = __dirname) {
  let directory = path.dirname(require.resolve(name, { paths: [from] }));
  while (directory !== path.dirname(directory)) {
    const packageFile = path.join(directory, 'package.json');
    if (fs.existsSync(packageFile)) {
      const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
      if (packageJson.name === name) return packageJson.version;
    }
    directory = path.dirname(directory);
  }
  throw new Error(`Unable to find package metadata for ${name}`);
}

test('planned provider graph resolves patched versions through actual consumers', () => {
  assert.equal(packageVersion('@strapi/provider-email-sendmail'), '5.56.0');
  assert.equal(
    packageVersion('nodemailer', path.dirname(require.resolve('@strapi/provider-email-sendmail'))),
    '10.0.13'
  );
  assert.equal(packageVersion('axios', path.dirname(require.resolve('@strapi/cloud-cli'))), '1.20.0');

  const strapiEntry = require.resolve('@strapi/strapi');
  const uploadPackage = path.dirname(
    require.resolve('@strapi/upload/package.json', { paths: [path.dirname(strapiEntry)] })
  );
  assert.equal(packageVersion('sharp', uploadPackage), '0.35.4');
});
