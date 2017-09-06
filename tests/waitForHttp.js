'use strict';

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
      /*eslint-disable no-console */
      console.log('wait for http...');
      setTimeout(connectWithRetry, 500, success);
    });
};

connectWithRetry(function () {
  console.log('http available');
});
/*eslint-enable no-console */
