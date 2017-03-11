'use strict';

/**
 * Interesting reads:
 * https://blogs.dropbox.com/tech/2016/09/how-dropbox-securely-stores-your-passwords/
 * https://news.ycombinator.com/item?id=12548210
 * https://pulse.michalspacek.cz/passwords/storages
 *
 */

/**
 * define for nested user parameter for box creation request
 * @apiDefine User Parameters for creating a new openSenseMap user
 */

/**
 * @apiDefine UserBody
 *
 * @apiParam (User) {String} name the full name or nickname of the user. The name must consist of at least 4 and up to 40 characters and only allows to use alphanumerics (a-zA-Z0-9), dots (.), dashes (-), underscores (_) and spaces. The first character must be a letter or number.
 * @apiParam (User) {String} email the email for the user. Is used for signing in and for sending the arduino sketch.
 * @apiParam (User) {String} password the desired password for the user. Must be at least 8 characters long.
 * @apiParam (User) {String} [language=en_US] the language of the user. Used for the website and mails
 *
 */

/**
 * @apiDefine JWTokenAuth
 *
 * @apiHeader {String} Authorization allows to send a valid JSON Web Token along with this request with `Bearer` prefix.
 * @apiHeaderExample {String} Authorization Header Example
 *   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE0ODMwMDYxNTIsImV4cCI6MTQ4MzAwOTc1MiwiaXNzIjoibG9jYWxob3N0OjgwMDAiLCJzdWIiOiJ0ZXN0QHRlc3QuZGUiLCJqdGkiOiJmMjNiOThkNi1mMjRlLTRjOTQtYWE5Ni1kMWI4M2MzNmY1MjAifQ.QegeWHWetw19vfgOvkTCsBfaSOPnjakhzzRjVtNi-2Q
 * @apiError {String} 403 Unauthorized
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

const userNameRequirementsText = 'Parameter name must consist of at least 4 and up to 40 alphanumerics (a-zA-Z0-9), dot (.), dash (-), underscore (_) and spaces. The first character must be a letter or number.',
  userEmailRequirementsText = 'Parameter {PATH} is not a valid email address.';

const nameValidRegex = /^[\w][\w\s-\.]+[\w-\.]$/,
  emailValidRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    minlength: [ 4, userNameRequirementsText ],
    maxlength: [ 40, userNameRequirementsText ],
    validate: {
      validator: function (v) {
        return nameValidRegex.test(v);
      },
      message: userNameRequirementsText
    }
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    validate: {
      validator: function (v) {
        return emailValidRegex.test(v);
      },
      message: userEmailRequirementsText
    }
  },
  unconfirmedEmail: {
    type: String,
    trim: true,
    lowercase: true,
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
  emailIsConfirmed: { type: Boolean, default: false, required: true }
});

// only send out names and email..
userSchema.set('toJSON', {
  version: false,
  transform: function transform (doc, ret) {
    const { name, email, role, language, boxes } = ret;

    return { name, email, role, language, boxes };
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
    // also set resetPasswordToken
    this.resetPasswordToken = '';
    // set expires to one hour in the past
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

userSchema.statics.validatePassword = function validatePassword (newPassword) {
  return newPassword.length >= password_min_length;
};

userSchema.path('hashedPassword').validate(function () {
  if (this._password) {
    if (this.schema.statics.validatePassword(this._password) === false) {
      return this.invalidate('password', `must be at least ${password_min_length} characters.`);
    }
  }

  if (this.isNew && !this._password) {
    return this.invalidate('password', 'is required');
  }
});

// this validation runs every time an user wants to change their email address
// it checks if the new address isn't already existant in the database
// and also validates against the email validation regex
userSchema.path('unconfirmedEmail').validate(function validateUnconfirmedEmail (value, callback) {
  if (value !== '' || value !== this.email) {
    if (!emailValidRegex.test(value)) {
      return callback(false);
    }

    this.model('User')
      .count({ $or: [ { email: value }, { unconfirmedEmail: value } ] })
      .then(function (count) {
        callback(count === 0);
      })
      .catch(function (err) {
        Honeybadger.notify(err);

        return callback(false);
      });
  }

  callback(true);
});

userSchema.pre('save', function userPreSave (next) {
  this.wasNew = this.isNew;
  next();
});

// runs after successful save of users
userSchema.post('save', function userPostSaveSendMails (user) {
  if (user.wasNew) {
    user.mail('newUser');

    return;
  }

  if (user.unconfirmedEmail !== '') {
    user.mail('confirmEmail');
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

  user.resetPasswordToken = uuid();
  user.resetPasswordExpires = moment.utc()
    .add(12, 'hours')
    .toDate();

  return user.save()
    .then(function (savedUser) {
      return savedUser.mail('passwordReset');
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
  const payload = { role: this.role },
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
              user.mail('newBox', savedBox);

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

userSchema.methods.mail = function mail (template, data) {
  return mails.sendMail(template, this, data);
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
