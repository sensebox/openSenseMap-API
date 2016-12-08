'use strict';

const models = require('../models'),
  restify = require('restify'),
  requestUtils = require('../requestUtils'),
  Honeybadger = require('../utils').Honeybadger;

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
  const { firstname, lastname, email, password } = req.params;

  new User({ firstname, lastname, email, password })
    .save()
    .then(function (newUser) {
      return res.send(newUser);
    })
    .catch(function (err) {
      console.log(err.errors);

      return next(err);
    });

};

const signIn = function signIn (req, res, next) {
  const { email, password } = req.params;

  User.findOne({ email })
    .exec()
    .then(function (user) {
      return user.checkPassword(password);
    })
    .then(function (passwordCorrect) {
      res.send(passwordCorrect);
    })
    .catch(function (err) {
      console.log(err.errors);

      return next(err);
    });
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
  ]
};
