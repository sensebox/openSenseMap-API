'use strict';

// see https://github.com/mqttjs/MQTT.js#client
const ALLOWED_KEYS = [
  'keepalive',
  'reschedulePings',
  'clientId',
  'username',
  'password'
];

module.exports = {
  // userConnectionOptions is a string which contains json
  parse (userConnectionOptions) {
    let opts = {};

    if (userConnectionOptions) {
      let userOptions;

      try {
        userOptions = JSON.parse(userConnectionOptions);
      } catch (e) {
        console.log('unable to parse user supplied connectionOptions', e);
      }

      if (userOptions) {
        // just handle keys in the ALLOWED_KEYS array
        ALLOWED_KEYS.forEach(function (key) {
          if (userOptions[key]) {
            opts[key] = userOptions[key];
          }
        });
      }
    }

    // check if there was a user supplied clientId
    // and if not generate one..
    if (!opts.clientId || typeof opts.clientId !== 'string') {
      opts.clientId = 'osem_' + Math.random().toString(16).substr(2, 8);
    }

    return opts;
  }
};
