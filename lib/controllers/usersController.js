'use strict';

const models = require('../models'),
  restify = require('restify'),
  requestUtils = require('../requestUtils'),
  Honeybadger = require('../utils').Honeybadger,
  tokenBlacklist = require('../helpers').tokenBlacklist,
  moment = require('moment');

const { Box, User } = models;

/**
 * @api {get} /users/:senseBoxId Validate authorization
 * @apiGroup Boxes
 * @apiUse AuthorizationRequiredError
 * @apiUse BoxIdParam
 * @apiParam {String} [returnBox] if supplied and non-empty, returns the senseBox with the senseBoxId with hidden fields
 * @apiDescription Validate authorization through API key and senseBoxId. Will return status code 403 if invalid, 200 if valid.
 * @apiSuccess {json} Response `{"code": "Authorized", "message":"ApiKey is valid"}`
 * @apiVersion 0.0.1
 * @apiName validApiKey
 */
const validApiKey = function validApiKey (req, res, next) {
  if (req.params['returnBox']) {
    Box.findAndPopulateBoxById(req._userParams.boxId, { includeSecrets: true })
      .then(function (box) {
        if (box) {
          res.send(box);
        } else {
          return next(new restify.NotFoundError('senseBox not found'));
        }
      })
      .catch(function (error) {
        const e = error.errors;
        Honeybadger.notify(error);

        return next(new restify.InternalServerError(e));
      });
  } else {
    res.send(200, { code: 'Authorized', message: 'ApiKey is valid' });
  }
};

const handleUserError = function handleUserError (err, next) {
  if (err.message === 'Duplicate user detected') {
    return next(new restify.BadRequestError(err.message));
  }

  if (err.errors) {
    const msg = Object.keys(err.errors)
      .map(f => `Parameter ${f} ${err.errors[f].message}`)
      .join(', ');

    return next(new restify.UnprocessableEntityError(msg));
  }


  return next(new restify.InternalServerError(err.message));
};

const registerUser = function registerUser (req, res, next) {
  const { firstname, lastname, email, password, language } = req._userParams;

  new User({ firstname, lastname, email, password, language })
    .save()
    .then(function (newUser) {
      newUser.createToken()
        .then(function (token) {
          return res.send(201, { code: 'Created', message: 'Successfully registered new user', data: { user: newUser }, token });
        })
        .catch(function (err) {
          next(new restify.InternalServerError(`User successfully created but unable to create jwt token: ${err.message}`));
        });
    })
    .catch(function (err) {
      handleUserError(err, next);
    });
};

const signIn = function signIn (req, res, next) {
  req.user.createToken()
    .then(function (token) {
      return res.send(200, { code: 'Authorized', message: 'Successfully signed in', data: { user: req.user }, token });
    })
    .catch(function (err) {
      next(new restify.InternalServerError(`unable to create jwt token: ${err.message}`));
    });
};

const signOut = function signOut (req, res) {
  tokenBlacklist.addTokenToBlacklist(req._jwt);

  res.send(200, { code: 'Ok', message: 'Successfully signed out' });
};

// generate new password reset token and send the token to the user
const requestResetPassword = function requestResetPassword (req, res, next) {
  // gather request parameters
  const email = req._userParams.email;

  User.findOne({ email })
    .exec()
    .then(function (user) {
      if (!user) {
        return next(new restify.ForbiddenError('password reset for this user not possible'));
      }

      user.initPasswordReset()
        .then(function () {
          res.send(200, { code: 'Ok', message: 'password reset initiated' });
        });

    })
    .catch(function (err) {
      handleUserError(err, next);
    });
};

// set new password with reset token as auth
const resetPassword = function resetPassword (req, res, next) {
  const { password, token, email } = req._userParams;

  User.findOne({ email, resetPasswordToken: token })
    .exec()
    .then(function (user) {
      if (!user) {
        return next(new restify.ForbiddenError('password reset for this user not possible'));
      }

      if (moment.utc().isAfter(moment.utc(user.resetPasswordExpires))) {
        return next(new restify.ForbiddenError('password reset token expired'));
      }

      // set user specified password..
      // also changes the passwordResetToken
      user.set('password', password);

      return user.save()
        .then(function () {
          res.send(200, { code: 'Ok', message: 'Password successfully changed. You can now login with your new password' });
        });
    })
    .catch(function (err) {
      handleUserError(err, next);
    });
};

const confirmEmailAddress = function confirmEmailAddress (req, res, next) {
  const { token, email } = req._userParams;

  User.findOne({ email, emailConfirmationToken: token })
    .exec()
    .then(function (user) {
      if (!user) {
        return next(new restify.ForbiddenError('invalid email confirmation token'));
      }

      // mark user as confirmed
      user.set('emailConfirmationToken', '');
      user.set('emailIsConfirmed', true);

      return user.save()
        .then(function () {
          res.send(200, { code: 'Ok', message: 'E-Mail successfully confirmed. Thank you' });
        });
    })
    .catch(function (err) {
      handleUserError(err, next);
    });
};

module.exports = {
  validApiKey,
  registerUser: [
    requestUtils.checkContentType,
    requestUtils.retrieveParameter('email', 'String', true),
    requestUtils.retrieveParameter('password', 'String', true),
    requestUtils.retrieveParameter('firstname', 'String', true),
    requestUtils.retrieveParameter('lastname', 'String'),
    requestUtils.retrieveParameter('language', 'String', 'en_US'),
    registerUser
  ],
  signIn: [
    requestUtils.checkContentType,
    signIn
  ],
  signOut,
  resetPassword: [
    requestUtils.retrieveParameter('token', 'String', true),
    requestUtils.retrieveParameter('password', 'String', true),
    requestUtils.retrieveParameter('email', 'String', true),
    resetPassword
  ],
  requestResetPassword: [
    requestUtils.checkContentType,
    requestUtils.retrieveParameter('email', 'String', true),
    requestResetPassword
  ],
  confirmEmailAddress: [
    requestUtils.checkContentType,
    requestUtils.retrieveParameter('token', 'String', true),
    requestUtils.retrieveParameter('email', 'String', true),
    confirmEmailAddress
  ]
};
