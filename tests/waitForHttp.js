'use strict';

/* global describe it */
const request = require('request-promise-native');

if (!process.env.OSEM_TEST_BASE_URL || process.env.OSEM_TEST_BASE_URL === '') {
  process.env.OSEM_TEST_BASE_URL = 'http://localhost:8000';
}

/*eslint-disable no-console */
const connectWithRetry = function (success) {
  return request(`${process.env.OSEM_TEST_BASE_URL}/boxes`)
    .then(function () {
      success();
    })
    .catch(function () {
      setTimeout(connectWithRetry, 500, success);
    });
};

describe('waiting for initialization', function () {
  it('waits for http ready', function (done) {
    this.timeout(10000);
    connectWithRetry(function () {
      console.log('http available');
      done();
    });
  });

});
/*eslint-enable no-console */
