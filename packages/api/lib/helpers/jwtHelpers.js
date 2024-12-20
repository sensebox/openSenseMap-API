'use strict';

const { addRefreshToken, deleteRefreshToken, findRefreshTokenUser } = require('@sensebox/opensensemap-api-models/src/token/refresh');
const { findUserByEmailAndRole } = require('@sensebox/opensensemap-api-models/src/user');
const config = require('config'),
  jwt = require('jsonwebtoken'),
  hashJWT = require('./jwtRefreshTokenHasher'),
  { addTokenToBlacklist, isTokenBlacklisted, addRefreshTokenToBlacklist } = require('./tokenBlacklist'),
  { v4: uuidv4 } = require('uuid'),
  moment = require('moment'),
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
    signOptions = Object.assign({ subject: user.email, jwtid: uuidv4() }, jwtSignOptions);

  return new Promise(function (resolve, reject) {
    jwt.sign(payload, jwt_secret, signOptions, async (err, token) => {
      if (err) {
        return reject(err);
      }

      // JWT generation was successful
      // we now create the refreshToken.
      // and set the refreshTokenExpires to 1 week
      // it is a HMAC of the jwt string
      const refreshToken = hashJWT(token);
      const refreshTokenExpiresAt = moment.utc().add(Number(refresh_token_validity_ms), 'ms')
        .toDate();
      try {
        await addRefreshToken(user.id, refreshToken, refreshTokenExpiresAt);

        return resolve({ token, refreshToken });
      } catch (err) {
        return reject(err);
      }
    });
  });
};

const invalidateToken = async function invalidateToken ({ user, _jwt, _jwtString } = {}) {
  // createToken(user); // TODO: why do we create a new token here?!?!
  const hash = hashJWT(_jwtString);
  await deleteRefreshToken(hash);
  addTokenToBlacklist(_jwt, _jwtString);
};

const refreshJwt = async function refreshJwt (refreshToken) {
  // const user = await User.findOne({ refreshToken, refreshTokenExpires: { $gte: moment.utc().toDate() } });
  const user = await findRefreshTokenUser(refreshToken);

  if (!user) {
    throw new ForbiddenError('Refresh token invalid or too old. Please sign in with your username and password.');
  }

  // Add the old refresh token to the blacklist
  addRefreshTokenToBlacklist(refreshToken);

  const { token, refreshToken: newRefreshToken } = await createToken(user);

  return Promise.resolve({ token, refreshToken: newRefreshToken, user });
};

const jwtInvalidErrorMessage = 'Invalid JWT authorization. Please sign in to obtain new JWT.';

const verifyJwt = function verifyJwt (req, res, next) {
  // check if Authorization header is present
  const rawAuthorizationHeader = req.header('authorization');
  if (!rawAuthorizationHeader) {
    return next(new ForbiddenError(jwtInvalidErrorMessage));
  }

  const [bearer, jwtString] = rawAuthorizationHeader.split(' ');
  if (bearer !== 'Bearer') {
    return next(new ForbiddenError(jwtInvalidErrorMessage));
  }

  jwt.verify(jwtString, jwt_secret, {
    ...jwtVerifyOptions,
    ignoreExpiration: req.url === '/users/refresh-auth' ? true : false // ignore expiration for refresh endpoint
  }, async function (err, decodedJwt) {
    if (err) {
      return next(new ForbiddenError(jwtInvalidErrorMessage));
    }

    // check if the token is blacklisted by performing a hmac digest on the string representation of the jwt.
    // also checks the existence of the jti claim
    if (await isTokenBlacklisted(decodedJwt, jwtString)) {
      return next(new ForbiddenError(jwtInvalidErrorMessage));
    }

    findUserByEmailAndRole({ email: decodedJwt.sub.toLowerCase(), role: decodedJwt.role })
      .then(function (user) {
        if (!user) {
          throw new Error();
        }

        req.user = user;
        req._jwt = decodedJwt;
        req._jwtString = jwtString;

        return next();
      })
      .catch(function () {
        return next(new ForbiddenError(jwtInvalidErrorMessage));
      });
  });
};

const verifyJwtAndRefreshToken = async function verifyJwtAndRefreshToken (refreshToken, jwtString) {
  if (refreshToken !== hashJWT(jwtString)) {
    return Promise.reject(
      new ForbiddenError(
        'Refresh token invalid or too old. Please sign in with your username and password.'
      )
    );
  }
};

module.exports = {
  createToken,
  invalidateToken,
  refreshJwt,
  verifyJwt,
  verifyJwtAndRefreshToken
};
