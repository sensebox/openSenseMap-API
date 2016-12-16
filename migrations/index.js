'use strict';

const utils = require('../lib/utils'),
  mongoose = require('mongoose');

const makeUsersUnique = require('./0-make-users-unique');

utils.connectWithRetry(function () {
  makeUsersUnique()
    .then(function () {
      mongoose.disconnect();
    })
    .catch(function (err) {
      console.error(err);
      mongoose.disconnect();
    });
});
