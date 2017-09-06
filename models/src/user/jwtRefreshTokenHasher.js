'use strict';

const crypto = require('crypto'),
  { refresh_token_algorithm, refresh_token_secret } = require('../config');

const hashJWT = function hashJWT (jwtString) {
  if (typeof jwtString !== 'string') {
    throw new Error('method hashJWT expects a string parameter');
  }

  return crypto
    .createHmac(refresh_token_algorithm, refresh_token_secret)
    .update(jwtString)
    .digest('base64');
};

module.exports = hashJWT;
