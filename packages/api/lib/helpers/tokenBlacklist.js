'use strict';

const { insertTokenToBlacklist, findToken } = require('@sensebox/opensensemap-api-models/src/token');
const hashJWT = require('./jwtRefreshTokenHasher');

// TODO: Move this to pg_cron
// const cleanupExpiredTokens = function cleanupExpiredTokens () {
//   const now = Date.now() / 1000;
//   for (const jti of Object.keys(tokenBlacklist)) {
//     if (tokenBlacklist[jti].exp < now) {
//       delete tokenBlacklist[jti];
//     }
//   }
// };

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

const addTokenHashToBlacklist = function addTokenHashToBlacklist (tokenHash) {
  // cleanupExpiredTokens();

  // if (typeof tokenHash === 'string') {
  //   // just set the exp claim to now plus one week to be sure
  //   tokenBlacklist[tokenHash] = {
  //     exp: moment.utc()
  //       .add(1, 'week')
  //       .unix()
  //   };
  // }
};

module.exports = {
  isTokenBlacklisted,
  addTokenToBlacklist,
  addTokenHashToBlacklist
};
