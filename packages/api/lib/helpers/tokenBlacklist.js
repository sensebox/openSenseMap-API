'use strict';

const { insertTokenToBlacklist, findToken, insertTokenToBlacklistWithExpiresAt } = require('@sensebox/opensensemap-api-models/src/token');
const hashJWT = require('./jwtRefreshTokenHasher');
const moment = require('moment');

const isTokenBlacklisted = async function isTokenBlacklisted (token, tokenString) {
  if (!token.jti) { // token has no id.. -> shouldn't be accepted
    return true;
  }

  const hash = hashJWT(tokenString);

  const blacklistedToken = await findToken(hash);

  if (blacklistedToken.length > 0) {
    return true;
  }

  return false;
};

const addTokenToBlacklist = function addTokenToBlacklist (token, tokenString) {
  const hash = hashJWT(tokenString);

  if (token && token.jti) {
    insertTokenToBlacklist(hash, token);
  }
};

const addRefreshTokenToBlacklist = function addRefreshTokenToBlacklist (refreshToken) {
  insertTokenToBlacklistWithExpiresAt('', refreshToken, moment.utc().add(1, 'week')
    .unix());
};

module.exports = {
  isTokenBlacklisted,
  addTokenToBlacklist,
  addRefreshTokenToBlacklist
};
