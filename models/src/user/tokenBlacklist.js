'use strict';

const moment = require('moment'),
  hashJWT = require('./jwtRefreshTokenHasher');

// our token blacklist is just a js object with
// jtis as keys and all claims as values
const tokenBlacklist = Object.create(null);

const cleanupExpiredTokens = function cleanupExpiredTokens () {
  const now = Date.now() / 1000;
  for (const jti of Object.keys(tokenBlacklist)) {
    if (tokenBlacklist[jti].exp < now) {
      delete tokenBlacklist[jti];
    }
  }
};

const isTokenBlacklisted = function isTokenBlacklisted (token, tokenString) {
  cleanupExpiredTokens();

  if (!token.jti) { // token has no id.. -> shouldn't be accepted
    return true;
  }

  const hash = hashJWT(tokenString);

  if (typeof tokenBlacklist[hash] !== 'undefined') {
    return true;
  }

  return false;
};

const addTokenToBlacklist = function addTokenToBlacklist (token, tokenString) {
  cleanupExpiredTokens();

  const hash = hashJWT(tokenString);

  if (token && token.jti) {
    tokenBlacklist[hash] = token;
  }
};

const addTokenHashToBlacklist = function addTokenHashToBlacklist (tokenHash) {
  cleanupExpiredTokens();

  if (typeof tokenHash === 'string') {
    // just set the exp claim to now plus one week to be sure
    tokenBlacklist[tokenHash] = {
      exp: moment.utc()
        .add(1, 'week')
        .unix()
    };
  }
};

module.exports = {
  isTokenBlacklisted,
  addTokenToBlacklist,
  addTokenHashToBlacklist
};
