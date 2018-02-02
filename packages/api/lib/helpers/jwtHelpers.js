'use strict';

const config = require('config'),
  jwt = require('jsonwebtoken'),
  hashJWT = require('./jwtRefreshTokenHasher'),
  { addTokenToBlacklist, addTokenHashToBlacklist, isTokenBlacklisted } = require('./tokenBlacklist'),
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

const jwtVerifyOptions = {
  algorithms: [jwt_algorithm],
  issuer: jwt_issuer,
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

const verifyJwt = function verifyJwt (req, res, next) {
  // check if Authorization header is present
  const rawAuthorizationHeader = req.header('authorization');
  if (!rawAuthorizationHeader) {
    return next(new ForbiddenError('invalid'));
  }

  const [bearer, jwtString] = rawAuthorizationHeader.split(' ');
  if (bearer !== 'Bearer') {
    return next(new ForbiddenError('invalid'));
  }

  jwt.verify(jwtString, jwt_secret, jwtVerifyOptions, function (err, decodedJwt) {
    if (err) {
      return next(new ForbiddenError('invalid'));
    }

    // check if the token is blacklisted by performing a hmac digest on the string representation of the jwt.
    // also checks the existence of the jti claim
    if (isTokenBlacklisted(decodedJwt, jwtString)) {
      return next(new ForbiddenError('invalid'));
    }

    User.findOne({ email: decodedJwt.sub.toLowerCase(), role: decodedJwt.role })
      .exec()
      .then(function (user) {
        if (!user) {
          throw new Error();
          // return next(new ForbiddenError('invalid'));
        }

        // check if there is a box id and check if this user owns this box
        // if (jwt.role !== 'admin' && req._userParams.boxId && !user.boxes.some(b => b.equals(req._userParams.boxId))) {
        //   return done(null, false, { error: JWT_WRONG_OR_UNAUTHORIZED });
        // }

        req.user = user;
        req._jwt = decodedJwt;
        req._jwtString = jwtString;

        return next();
      })
      .catch(function () {
        return next(new ForbiddenError('invalid'));
      });
  });
};

module.exports = {
  createToken,
  invalidateToken,
  refreshJwt,
  verifyJwt
};
