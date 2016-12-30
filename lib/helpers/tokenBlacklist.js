'use strict';

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

const isTokenBlacklisted = function isTokenBlacklisted (token) {
  cleanupExpiredTokens();
  if (!token.jti) { // token has no id.. -> shouldn't be accepted
    return true;
  }

  if (typeof tokenBlacklist[token.jti] !== 'undefined') {
    return true;
  }

  return false;
};

const addTokenToBlacklist = function addTokenToBlacklist (token) {
  cleanupExpiredTokens();
  if (token && token.jti) {
    tokenBlacklist[token.jti] = token;
  }
};

module.exports = {
  isTokenBlacklisted,
  addTokenToBlacklist
};
