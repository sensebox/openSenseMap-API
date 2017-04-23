'use strict';

const request = require('request-promise-native');

const connectWithRetry = function (success) {
  return request('http://localhost:8000/boxes')
    .then(function () {
      success();
    })
    .catch(function () {
      console.log('wait for http...');
      setTimeout(connectWithRetry, 500, success);
    });
};

connectWithRetry(function () {
  console.log('http available');
});
