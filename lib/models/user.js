'use strict';
/**
 * @apiDefine AuthorizationRequiredError
 *
 * @apiHeader {String} x-apikey the secret API key which corresponds to the <code>senseBoxId</code> parameter.
 * @apiHeaderExample {String} x-apikey header example:
 *   x-apikey: 576efef4cb9b9ebe057bf7b4
 * @apiError {Object} 403 the request has invalid or missing credentials.
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 403 Forbidden
 *     {"code":"NotAuthorized","message":"ApiKey is invalid or missing"}
 */

/**
 * define for nested user parameter for box creation request
 * @apiDefine User Parameter for creating the user for a senseBox
 */

/**
 * @apiDefine UserBody
 *
 * @apiParam (User) {String} firstname the firstname of the user.
 * @apiParam (User) {String} lastname the ths lastname of the user.
 * @apiParam (User) {String} email the email for the user. is used for sending the arduino sketch.
 * @apiParam (User) {String} lang the language of the user.
 *
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var userSchema = new Schema({
  firstname: {
    type: String,
    required: true,
    trim: true
  },
  lastname: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  apikey: {
    type: String,
    trim: true,
    minlength: 24,
    unique: true,
    required: true
  },
  boxes: [
    {
      type: String,
      trim: true
    }
  ],
  language: {
    type: String,
    trim: true,
    default: 'de_DE'
  }
});

var handleE11000 = function (error, res, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('Duplicate senseBox found'));
  } else {
    next();
  }
};

userSchema.post('save', handleE11000);
userSchema.post('update', handleE11000);
userSchema.post('findOneAndUpdate', handleE11000);
userSchema.post('insertMany', handleE11000);

var userModel = mongoose.model('User', userSchema);

module.exports = {
  schema: userSchema,
  model: userModel
};
