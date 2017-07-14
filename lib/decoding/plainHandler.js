'use strict';

// this handler is only for debugging..
const log = require('../log');

module.exports = {
  decodeMessage: function (message) {
    log.debug(message);

    return Promise.resolve();
  }
};
