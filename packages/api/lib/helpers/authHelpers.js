'use strict';

const passport = require('passport'),
  config = require('config').get('jwt'),
  passportJwt = require('passport-jwt'),
  { User } = require('@sensebox/opensensemap-api-models'),
  { isTokenBlacklisted } = require('./tokenBlacklist');

const { Strategy: JwtStrategy, ExtractJwt } = passportJwt;

const jwtOptions = {
  session: false,
  passReqToCallback: true,
  secretOrKey: config.get('secret'),
  issuer: config.get('issuer'),
  algorithms: [config.get('algorithm')],
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer')
};

const JWT_WRONG_OR_UNAUTHORIZED = 'Permission denied: Token invalid or user not authorized';

const jwtLogin = new JwtStrategy(jwtOptions, function verifiyJwtLogin (req, jwt, done) {
  const jwtString = req.headers.authorization.split(' ')[1];
  // check if the token is blacklisted by performing a hmac digest on the string representation of the jwt.
  // also checks the existence of the jti claim
  if (isTokenBlacklisted(jwt, jwtString)) {
    return done(null, false, { error: JWT_WRONG_OR_UNAUTHORIZED });
  }

  const userQuery = { email: jwt.sub.toLowerCase(), role: jwt.role };
  User.findOne(userQuery)
    .exec()
    .then(function (user) {
      if (!user) {
        return done(null, false, { error: JWT_WRONG_OR_UNAUTHORIZED });
      }

      // check if there is a box id and check if this user owns this box
      // if (jwt.role !== 'admin' && req._userParams.boxId && !user.boxes.some(b => b.equals(req._userParams.boxId))) {
      //   return done(null, false, { error: JWT_WRONG_OR_UNAUTHORIZED });
      // }

      req._jwt = jwt;
      req._jwtString = jwtString;

      return done(null, user);
    })
    /* eslint-disable no-unused-vars */
    .catch(function (err) {
      done(null, false, { error: JWT_WRONG_OR_UNAUTHORIZED });
    });
  /* eslint-enable no-unused-vars */
});
passport.use(jwtLogin);

const authOptions = {
  session: false
};

const checkJwt = passport.authenticate(
  'jwt',
  authOptions
);

module.exports = {
  checkJwt
};
