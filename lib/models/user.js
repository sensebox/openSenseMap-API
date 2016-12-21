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
 * @apiParam (User) {String} firstname the firstname or nickname of the user.
 * @apiParam (User) {String} [lastname] the ths lastname of the user.
 * @apiParam (User) {String} email the email for the user. Is used for signing in and for sending the arduino sketch.
 * @apiParam (User) {String} password the desired password for the user. Must be at least 8 characters long.
 * @apiParam (User) {String} [language=de_DE] the language of the user. Used for the website and mails
 *
 */

const mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  bcrypt = require('bcrypt'),
  crypto = require('crypto'),
  utils = require('../utils'),
  uuid = require('uuid'),
  jwt = require('jsonwebtoken'),
  Box = require('./box').model,
  mails = require('../mails'),
  sketches = require('../sketches'),
  moment = require('moment');

const { config, Honeybadger } = utils;
const { salt_factor, password_min_length, jwt_algorithm, jwt_secret, origin } = config;

const userSchema = new Schema({
  firstname: {
    type: String,
    required: true,
    trim: true
  },
  lastname: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
  },
  boxes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Box'
  }],
  language: {
    type: String,
    trim: true,
    default: 'en_US'
  },
  hashedPassword: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
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
    const { firstname, lastname, fullname, email, role, language, boxes } = ret;

    return { firstname, lastname, fullname, email, role, language, boxes };
  }
});

userSchema.virtual('fullname').get(function () {
  let fullname = this.firstname;
  if (typeof this.lastname !== 'undefined' && this.lastname !== '') {
    fullname = `${fullname} ${this.lastname}`;
  }

  return fullname;
});

// ----  Password stuff -----
userSchema.virtual('password')
  .get(function () {
    return this._password;
  })
  .set(function (value) {
    this._password = value;
    this.hashedPassword = 'If this is here, it means there was an error';
    // also set resetPasswordToken
    this.resetPasswordToken = uuid();
    this.resetPasswordExpires = moment.utc()
      .subtract(1, 'hour')
      .toDate();
  });

const passwordHasher = function passwordHasher (plaintextPassword) {
  // first round: hash plaintextPassword with sha512
  const hash = crypto.createHash('sha512');

  hash.update(plaintextPassword, 'utf8');

  const hashed = hash.digest('base64'); // base64 for more entroy than hex

  return bcrypt.hash(hashed, salt_factor); // signature <String, Number> generates a salt and hashes in one step
};

userSchema.path('hashedPassword').validate(function () {
  if (this._password) {
    if (this._password.length < password_min_length) {
      return this.invalidate('password', `must be at least ${password_min_length} characters.`);
    }
  }

  if (this.isNew && !this._password) {
    return this.invalidate('password', 'is required');
  }
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

userSchema.methods.initPasswordReset = function initPasswordReset () {
  const user = this;

  return user.update({
    resetPasswordToken: uuid(),
    resetPasswordExpires: moment.utc()
      .add(12, 'hours')
      .toDate(),
  })
  .exec()
  .then(function () {
    return mails.sendPasswordResetMail(user);
  });
};
// ---- End Password stuff -----

// ---- JWT stuff ----
const jwtSignOptions = {
  algorithm: jwt_algorithm,
  issuer: origin,
  expiresIn: '1h'
};

userSchema.methods.createToken = function createToken () {
  const payload = {},
    signOptions = Object.assign({ subject: this.email, jwtid: uuid() }, jwtSignOptions);

  return new Promise(function (resolve, reject) {
    jwt.sign(payload, jwt_secret, signOptions, (err, token) => {
      if (err) {
        return reject(err);
      }

      return resolve(token);
    });
  });
};

// ---- End JWT Stuff ----

userSchema.methods.addBox = function addBox (req) {
  const user = this;

  // initialize new box
  return Box.initNew(req)
    .then(function (newBox) {
      // request is valid
      // try to save it
      return newBox.save()
        .then(function (savedBox) {

          // persist the saved box in the user
          user.boxes.push(savedBox);

          return user.save()
            .then(function () {
              sketches.generateSketch(savedBox);
              utils.postToSlack(`Eine neue <https://opensensemap.org/explore/${newBox._id}|senseBox> wurde registriert (${savedBox.name})`);
              mails.sendWelcomeMail(user, savedBox);

              return savedBox;
            });
        });
    });
};

userSchema.methods.removeBox = function removeBox (boxId) {
  const user = this;

  // first check if the box belongs to this user
  if (!user.boxes) {
    return Promise.reject(new Error('user does not own this senseBox'));
  }

  const userOwnsBox = user.boxes.some(b => b.equals(boxId));

  if (userOwnsBox === false) {
    return Promise.reject(new Error('user does not own this senseBox'));
  }

  return Box.findById(boxId)
    .exec()
    .then(function (box) {
      if (!box) {
        return Promise.reject('coudn\'t remove, senseBox not found');
      }

      // remove measurements
      return box.removeSelfAndMeasurements();
    })
    .then(function () {
      // remove from boxes
      user.boxes.pull({ _id: boxId });

      return user.save();
    });
};

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
