'use strict';

const log = require('../../log');

// this handler is only for debugging..

module.exports = {
  decodeMessage: function (message) {
    log.debug(message);

    return Promise.resolve(message);
  }
};
