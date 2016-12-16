'use strict';

const request = require('request-promise-native'),
  config = require('../lib/utils').config;

const connectWithRetry = function (success) {
  return request('http://localhost:8000/boxes')
    .then(function (err) {
      success();
    })
    .catch(function (err) {
      console.log('wait for http...');
      setTimeout(connectWithRetry, 500, success);
    });
};

connectWithRetry(function () {
  console.log('http available');
});
