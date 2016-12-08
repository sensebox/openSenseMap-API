'use strict';

/**
 * Interesting reads:
 * https://blogs.dropbox.com/tech/2016/09/how-dropbox-securely-stores-your-passwords/
 * https://news.ycombinator.com/item?id=12548210
 * https://pulse.michalspacek.cz/passwords/storages
 *
 */

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

const mongoose = require('mongoose'),
  bcrypt = require('bcrypt'),
  crypto = require('crypto'),
  config = require('../utils').config,
  Schema = mongoose.Schema,
  uuid = require('uuid');

const { salt_factor, password_min_length, Honeybadger } = config;

const userSchema = new Schema({
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
    trim: true,
    lowercase: true,
    unique: true,
  },
  // apikey: {
  //   type: String,
  //   trim: true,
  //   minlength: 24,
  //   unique: true,
  //   required: true
  // },
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
  },
  hashedPassword: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  lastUpdatedBy: {
    type: String,
    required: true,
    default: 'System'
  },
  emailConfirmationToken: { type: String, default: uuid },
  emailConfirmationExpires: { type: Date },
  emailIsConfirmed: { type: Boolean, default: false, required: true }
});

// only send out names and email..
userSchema.set('toJSON', {
  version: false,
  transform: function transform (doc, ret) {
    const { firstname, lastname, email, role, language, _id } = ret;

    return { firstname, lastname, email, role, language, _id };
  }
});

// ----  Password stuff -----
userSchema.virtual('password')
  .get(function () {
    return this._password;
  })
  .set(function (value) {
    this._password = value;
    this.hashedPassword = 'If this is here, it means there was an error';
  });

const passwordHasher = function passwordHasher (plaintextPassword) {
  // first round: hash plaintextPassword with sha512
  const hash = crypto.createHash('sha512');

  hash.update(plaintextPassword, 'utf8');

  const hashed = hash.digest('base64'); // base64 for more entroy than hex

  return bcrypt.hash(hashed, salt_factor); // signature <String, Number> generates a salt and hashes in one step
};

userSchema.path('hashedPassword').validate(function (value, callback) {
  if (this._password) {
    if (this._password.length < password_min_length) {
      return callback(false, `password must be at least ${password_min_length} characters.`);
    }
  }

  if (this.isNew && !this._password) {
    return callback(false, 'password is required');
  }

  callback(true);
});

userSchema.pre('save', function userPreHashPassword (next) {
  const user = this;

  if (!user._password) {
    return next();
  }

  passwordHasher(user._password)
    .then(function (hashedPassword) {
      user._password = undefined;
      user.hashedPassword = hashedPassword;
      next();
    })
    .catch(function (err) {
      Honeybadger.notify(err);

      next(err);
    });
});

userSchema.methods.checkPassword = function checkPassword (plaintextPassword) {
  const hash = crypto.createHash('sha512');
  hash.update(plaintextPassword, 'utf8');
  const hashed = hash.digest('base64');

  return bcrypt.compare(hashed, this.hashedPassword);
};
// ---- End Password stuff -----

const handleE11000 = function (error, res, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    return next(new Error('Duplicate user detected'));
  }
  next();
};

userSchema.post('save', handleE11000);
userSchema.post('update', handleE11000);
userSchema.post('findOneAndUpdate', handleE11000);
userSchema.post('insertMany', handleE11000);

const userModel = mongoose.model('User', userSchema);

module.exports = {
  schema: userSchema,
  model: userModel
};
