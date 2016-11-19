'use strict';

const Box = require('../models').Box,
  restify = require('restify'),
  Honeybadger = require('../utils').Honeybadger;

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

module.exports = {
  validApiKey
};
