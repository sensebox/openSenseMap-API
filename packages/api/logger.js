'use strict';

const config = require('config');
const pino = require('pino-http');


module.exports = {
  stdLogger: pino({ name: 'opensensemap-api' }),
  debugLogger: pino({
    name: 'opensensemap-api-debug',
    serializers: {
      req (req) {
        if (config.get('logLevel') === 'debug') {
          req.body = req.raw.body;
        }

        return req;
      }
    }
  })
};
