'use strict';

const passport = require('passport'),
  utils = require('../utils'),
  LocalStrategy = require('passport-local'),
  passportJwt = require('passport-jwt'),
  User = require('../models').User,
  tokenBlacklist = require('./tokenBlacklist');

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
  issuer: config.origin,
  algorithms: [config.jwt_algorithm],
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer')
};

const MSG_CREDENTIALS_WRONG = 'Your login details could not be verified. Please try again.';

const localLogin = new LocalStrategy(localOptions, function verifiyLocalLogin (email, password, done) {
  User.findOne({ email })
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
      console.log(err);

      done(err, false, { error: MSG_CREDENTIALS_WRONG });
    });
});
passport.use(localLogin);

const JWT_WRONG_OR_UNAUTHORIZED = 'Permission denied: Token invalid or user not authorized';

const jwtLogin = new JwtStrategy(jwtOptions, function verifiyJwtLogin (req, jwt, done) {
  // check if the token is blacklisted. also checks if the token has no jti claim
  if (tokenBlacklist.isTokenBlacklisted(jwt)) {
    return done(null, false, { error: JWT_WRONG_OR_UNAUTHORIZED });
  }

  const userQuery = { email: jwt.sub };

  User.findOne(userQuery)
    .exec()
    .then(function (user) {
      if (!user) {
        return done(null, false, { error: JWT_WRONG_OR_UNAUTHORIZED });
      }

      // check if there is a box id and check if this user owns this box
      if (req._userParams.boxId) {
        userQuery.boxes = { $in: [req._userParams.boxid] };
      }

      req._jwt = jwt;

      return done(null, user);
    })
    .catch(function (err) {
      console.log(err);

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
