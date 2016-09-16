'use strict';

let jsonPath = require('jsonpath');

module.exports = {
  decodeMessage: function (message, options) {
    if (message) {
      let json;
      try {
        json = JSON.parse(message);
      } catch (err) {
        console.log(err);
      }

      if (typeof json !== 'undefined') {
        // use the root '$' if no jsonPath was specified
        let path = '$';
        if (options && options.jsonPath) {
          path = options.jsonPath;
        }
        let result;
        try {
          result = jsonPath.query(json, path, 1);
        } catch (err) {
          console.log(err);
        }

        if (result && result[0]) {
          return result[0];
        }
      }
    }
  }
};
