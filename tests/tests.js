'use strict';

if (!process.env.OSEM_TEST_BASE_URL) {
  process.env.OSEM_TEST_BASE_URL = 'http://127.0.0.1:8000';
}

const path = require('path').join(__dirname, 'tests');

require('fs')
  .readdirSync(path)
  .forEach(function (file) {
    /* eslint-disable global-require */
    require(`${path}/${file}`);
    /* eslint-enable global-require */
  });
