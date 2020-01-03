'use strict';

/* global describe it */
const got = require('got');

if (!process.env.OSEM_TEST_BASE_URL) {
  process.env.OSEM_TEST_BASE_URL = 'http://localhost:8000';
}

const connectWithRetry = function () {
  return got(`${process.env.OSEM_TEST_BASE_URL}/boxes`, {
    retry: {
        limit: () => {
        process.stdout.write('.');

        return 500;
      }
    }
  });
};

describe('waiting for initialization', function () {
  it('waits for http ready', function () {
    this.timeout(10000);

    return connectWithRetry();
  });
});
