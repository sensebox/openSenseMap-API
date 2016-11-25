'use strict';

const mongoose = require('mongoose'),
  config = require('../lib/utils').config;

const connectWithRetry = function (success) {
  return mongoose.connect(config.dbconnectionstring, {
    keepAlive: 1
  }, function (err) {
    if (err) {
      console.log('wait for db...');
      setTimeout(connectWithRetry, 1000, success);
    } else {
      success();
    }
  });
};

connectWithRetry(function () {
  console.log('db available');
  mongoose.disconnect();
});
