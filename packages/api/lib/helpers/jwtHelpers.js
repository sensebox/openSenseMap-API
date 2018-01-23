'use strict';

const config = require('config'),
  jwt = require('jsonwebtoken'),
  hashJWT = require('./jwtRefreshTokenHasher'),
  { addTokenToBlacklist, addTokenHashToBlacklist } = require('./tokenBlacklist'),
  uuid = require('uuid'),
  moment = require('moment'),
  { User } = require('@sensebox/opensensemap-api-models'),
  { ForbiddenError } = require('restify-errors');

const { algorithm: jwt_algorithm, secret: jwt_secret, issuer: jwt_issuer, validity_ms: jwt_validity_ms } = config.get('jwt');
const refresh_token_validity_ms = config.get('refresh_token.validity_ms');

const jwtSignOptions = {
  algorithm: jwt_algorithm,
  issuer: jwt_issuer,
  expiresIn: Math.round(Number(jwt_validity_ms) / 1000)
};

const createToken = function createToken (user) {
  const payload = { role: user.role },
    signOptions = Object.assign({ subject: user.email, jwtid: uuid() }, jwtSignOptions);

  return new Promise(function (resolve, reject) {
    jwt.sign(payload, jwt_secret, signOptions, (err, token) => {
      if (err) {
        return reject(err);
      }

      // JWT generation was successful
      // we now create the refreshToken.
      // and set the refreshTokenExpires to 1 week
      // it is a HMAC of the jwt string
      const refreshToken = hashJWT(token);
      user.update({
        $set: {
          refreshToken,
          refreshTokenExpires: moment.utc()
            .add(Number(refresh_token_validity_ms), 'ms')
            .toDate()
        }
      })
        .exec()
        .then(function () {
          return resolve({ token, refreshToken });
        })
        .catch(function (err) {
          return reject(err);
        });
    });
  });
};

const invalidateToken = function invalidateToken ({ user, _jwt, _jwtString } = {}) {
  createToken(user);
  addTokenToBlacklist(_jwt, _jwtString);
};

const refreshJwt = function refreshJwt (refreshToken) {
  return User.findOne({ refreshToken, refreshTokenExpires: { $gte: moment.utc().toDate() } })
    .then(function (user) {
      if (!user) {
        throw new ForbiddenError('Refresh token invalid or too old. Please sign in with your username and password.');
      }

      // invalidate old token
      addTokenHashToBlacklist(refreshToken);

      return createToken(user)
        .then(function ({ token, refreshToken }) {
          return { token, refreshToken, user };
        });
    });
};

module.exports = {
  createToken,
  invalidateToken,
  refreshJwt
};
