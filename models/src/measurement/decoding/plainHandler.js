'use strict';

// this handler is only for debugging..

module.exports = {
  decodeMessage: function (message) {
    /* eslint-disable no-console */
    console.log(message);
    /* eslint-enable no-console */

    return Promise.resolve(message);
  }
};
