'use strict';

const request = require('request-promise-native');

/*eslint-disable no-console */
const connectWithRetry = function (success) {
  return request('http://localhost:8000/boxes')
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
