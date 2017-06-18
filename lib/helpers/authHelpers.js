'use strict';

const passport = require('passport'),
  utils = require('../utils'),
  LocalStrategy = require('passport-local'),
  passportJwt = require('passport-jwt'),
  User = require('../models').User,
  tokenBlacklist = require('./tokenBlacklist'),
  log = require('../log');

const { Strategy: JwtStrategy, ExtractJwt } = passportJwt;

const { config } = utils;

const localOptions = {
  usernameField: 'email',
  session: false
};

const jwtOptions = {
  session: false,
  passReqToCallback: true,
  secretOrKey: config.jwt_secret,
  issuer: config.jwt_issuer,
  algorithms: [config.jwt_algorithm],
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer')
};

const MSG_CREDENTIALS_WRONG = 'Your login details could not be verified. Please try again.';

const localLogin = new LocalStrategy(localOptions, function verifiyLocalLogin (emailOrName, password, done) {
  User.findOne({ $or: [ { email: emailOrName }, { name: emailOrName } ] })
    .exec()
    .then(function (user) {
      if (!user) {
        return done(null, false, { error: MSG_CREDENTIALS_WRONG });
      }
      user.checkPassword(password)
        .then(function (passwordIsCorrect) {
          if (passwordIsCorrect === true) {
            return done(null, user);
          }

          return done(null, false, { error: MSG_CREDENTIALS_WRONG });
        })
        .catch(function (err) {
          throw err;
        });
    })
    .catch(function (err) {
      log.error(err);

      done(err, false, { error: MSG_CREDENTIALS_WRONG });
    });
});
passport.use(localLogin);

const JWT_WRONG_OR_UNAUTHORIZED = 'Permission denied: Token invalid or user not authorized';

const jwtLogin = new JwtStrategy(jwtOptions, function verifiyJwtLogin (req, jwt, done) {
  const jwtString = req.headers.authorization.split(' ')[1];
  // check if the token is blacklisted by performing a hmac digest on the string representation of the jwt.
  // also checks the existence of the jti claim
  if (tokenBlacklist.isTokenBlacklisted(jwt, jwtString)) {
    return done(null, false, { error: JWT_WRONG_OR_UNAUTHORIZED });
  }

  const userQuery = { email: jwt.sub, role: jwt.role };
  User.findOne(userQuery)
    .exec()
    .then(function (user) {
      if (!user) {
        return done(null, false, { error: JWT_WRONG_OR_UNAUTHORIZED });
      }

      // check if there is a box id and check if this user owns this box
      if (jwt.role !== 'admin' && req._userParams.boxId && !user.boxes.some(b => b.equals(req._userParams.boxId))) {
        return done(null, false, { error: JWT_WRONG_OR_UNAUTHORIZED });
      }

      req._jwt = jwt;
      req._jwtString = jwtString;

      return done(null, user);
    })
    .catch(function (err) {
      log.error(err);

      done(null, false, { error: JWT_WRONG_OR_UNAUTHORIZED });
    });
});
passport.use(jwtLogin);

const authOptions = {
  session: false
};

const checkUsernamePassword = passport.authenticate(
  'local',
  authOptions
);

const checkJwt = passport.authenticate(
  'jwt',
  authOptions
);

module.exports = {
  checkUsernamePassword,
  checkJwt
};
