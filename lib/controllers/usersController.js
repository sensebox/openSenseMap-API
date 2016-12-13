'use strict';

const models = require('../models'),
  restify = require('restify'),
  requestUtils = require('../requestUtils'),
  Honeybadger = require('../utils').Honeybadger,
  tokenBlacklist = require('../helpers').tokenBlacklist;

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

const registerUser = function registerUser (req, res, next) {
  const { firstname, lastname, email, password, language } = req.params;

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

module.exports = {
  validApiKey,
  registerUser: [
    requestUtils.checkContentType,
    registerUser
  ],
  signIn: [
    requestUtils.checkContentType,
    signIn
  ],
  signOut
};
