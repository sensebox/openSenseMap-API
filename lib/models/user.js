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
 * @apiParam (User) {String} name the full name or nickname of the user. The name must consist of at least 3 and up to 40 characters and only allows to use alphanumerics (a-zA-Z0-9), dots (.), dashes (-), underscores (_) and spaces. The first character must be a letter or number.
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

const { mongoose } = require('../db'),
  Schema = mongoose.Schema,
  bcrypt = require('bcrypt'),
  crypto = require('crypto'),
  { config: { jwt_algorithm, jwt_secret, jwt_issuer, password_min_length, password_salt_factor, jwt_validity_ms, refresh_token_validity_ms }, Honeybadger, postToSlack, redactEmail } = require('../utils'),
  uuid = require('uuid'),
  jwt = require('jsonwebtoken'),
  Box = require('./box').model,
  mails = require('../mails'),
  moment = require('moment'),
  hashJWT = require('../helpers/jwtRefreshTokenHasher'),
  tokenBlacklist = require('../helpers/tokenBlacklist'),
  timestamp = require('mongoose-timestamp'),
  ModelError = require('./modelError'),
  isemail = require('isemail');

const userNameRequirementsText = 'Parameter name must consist of at least 3 and up to 40 alphanumerics (a-zA-Z0-9), dot (.), dash (-), underscore (_) and spaces.',
  userEmailRequirementsText = 'Parameter {PATH} is not a valid email address.';

const nameValidRegex = /^[^~`!@#$%^&*()+=£€{}[\]|\\:;"'<>,?/\n\r\t\s][^~`!@#$%^&*()+=£€{}[\]|\\:;"'<>,?/\n\r\t]{1,39}[^~`!@#$%^&*()+=£€{}[\]|\\:;"'<>,?/\n\r\t\s]$/;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    minlength: [ 3, userNameRequirementsText ],
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
      isAsync: false,
      validator: isemail.validate,
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
  emailIsConfirmed: { type: Boolean, default: false, required: true },
  refreshToken: { type: String },
  refreshTokenExpires: { type: Date }
});
userSchema.plugin(timestamp);

// only send out names and email..
userSchema.set('toJSON', {
  version: false,
  transform: function transform (doc, ret) {
    const { name, email, role, language, boxes, emailIsConfirmed } = ret;

    return { name, email, role, language, boxes, emailIsConfirmed };
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

const preparePasswordHash = function preparePasswordHash (plaintextPassword) {
  // first round: hash plaintextPassword with sha512
  const hash = crypto.createHash('sha512');
  hash.update(plaintextPassword, 'utf8');
  const hashed = hash.digest('base64'); // base64 for more entropy than hex

  return hashed;
};

const passwordHasher = function passwordHasher (plaintextPassword) {
  return bcrypt.hash(preparePasswordHash(plaintextPassword), password_salt_factor); // signature <String, Number> generates a salt and hashes in one step
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

// use this virtual to set the unconfirmedEmail
userSchema.virtual('newEmail').set(function (value) {
  this._newEmail = value;
  this.unconfirmedEmail = value;
});

// this validation runs every time an user wants to change their email address
// it checks if the new address isn't already existant in the database
// and also validates against the email validation regex
userSchema.path('unconfirmedEmail').validate({
  isAsync: true,
  validator: function (value, callback) {
    // only run this validation if the new Email has just been set
    if (this._newEmail) {
      const user = this;
      if (!isemail.validate(user._newEmail)) {
        return callback(false);
      }

      return this.model('User')
        .count({ $or: [ { email: user._newEmail }, { unconfirmedEmail: user._newEmail } ] })
        .then(function (count) {
          user._newEmail = undefined;
          callback(count === 0);
        })
        .catch(function (err) {
          /* eslint-disable callback-return */
          callback(false);
          throw err;
          /* eslint-enable callback-return */
        });
    }

    callback(true);
  }
});

userSchema.pre('save', function userPreSave (next) {
  this.wasNew = this.isNew;
  next();
});

// runs after successful save of users
userSchema.post('save', function userPostSaveSendMails (user) {
  if (user.wasNew) {
    user.mail('newUser');
    postToSlack(`New User: ${user.name} (${redactEmail(user.email)})`);

    return;
  }

  if (user.unconfirmedEmail && user.unconfirmedEmail !== '') {
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
      next(err);
    });
});

userSchema.methods.checkPassword = function checkPassword (plaintextPassword) {
  return bcrypt.compare(preparePasswordHash(plaintextPassword), this.hashedPassword);
};

userSchema.statics.initPasswordReset = function initPasswordReset ({ email }) {
  return this.findOne({ email })
    .exec()
    .then(function (user) {
      if (!user) {
        throw new ModelError('Password reset for this user not possible', { type: 'ForbiddenError' });
      }

      user.resetPasswordToken = uuid();
      user.resetPasswordExpires = moment.utc()
        .add(12, 'hours')
        .toDate();

      return user.save()
        .then(function (savedUser) {
          return savedUser.mail('passwordReset');
        });
    });
};
// ---- End Password stuff -----

// ---- JWT stuff ----
const jwtSignOptions = {
  algorithm: jwt_algorithm,
  issuer: jwt_issuer,
  expiresIn: Math.round(jwt_validity_ms / 1000)
};

userSchema.methods.createToken = function createToken () {
  const payload = { role: this.role },
    signOptions = Object.assign({ subject: this.email, jwtid: uuid() }, jwtSignOptions),
    user = this;

  return new Promise(function (resolve, reject) {
    jwt.sign(payload, jwt_secret, signOptions, (err, token) => {
      if (err) {
        return reject(err);
      }

      // JWT generation was successful
      // we now create the refreshToken.
      // and set the refreshTokenExpires to 1 week
      // it is a HMAC of the jwt string
      const refreshToken = hashJWT(token);
      user.update({
        $set: {
          refreshToken,
          refreshTokenExpires: moment.utc()
            .add(refresh_token_validity_ms, 'ms')
            .toDate()
        }
      })
        .exec()
        .then(function () {
          return resolve({ token, refreshToken });
        })
        .catch(function (err) {
          return reject(err);
        });

    });
  });
};

userSchema.methods.signOut = function signOut (req) {
  // generates new JWT and refreshToken. Just don't send to the user
  this.createToken()
    .catch(function (err) {
      Honeybadger.notify(err);
    });

  tokenBlacklist.addTokenToBlacklist(req._jwt, req._jwtString);
};

userSchema.statics.refreshJwt = function refreshJwt (refreshToken) {
  return this.findOne({ refreshToken, refreshTokenExpires: { $gte: moment.utc().toDate() } })
    .then(function (user) {
      if (!user) {
        throw new ModelError('Refresh token invalid or too old. Please sign in with your username and password.', { type: 'ForbiddenError' });
      }

      // invalidate old token
      tokenBlacklist.addTokenHashToBlacklist(refreshToken);

      return user.createToken()
        .then(function ({ token, refreshToken }) {
          return { token, refreshToken, user };
        });
    });
};
// ---- End JWT Stuff ----

userSchema.methods.addBox = function addBox (params) {
  const user = this;

  // initialize new box
  return Box.initNew(params)
    .then(function (newBox) {
      // request is valid
      // try to save it
      return newBox.save();
    })
    .then(function (savedBox) {
      // persist the saved box in the user
      user.boxes.push(savedBox);

      return user.save()
        .then(function () {
          let mailTemplate = 'newBox';
          if (savedBox.model && savedBox.model.toString().includes('luftdaten')) {
            mailTemplate = 'newBoxLuftdaten';
          }

          postToSlack(`New Box: ${user.name} (${redactEmail(user.email)}) just registered "${savedBox.name}" (${savedBox.model}): <https://opensensemap.org/explore/${savedBox._id}|link>`);
          user.mail(mailTemplate, savedBox);

          return savedBox;
        });
    });
};

userSchema.methods.checkBoxOwner = function checkBoxOwner (boxId) {
  const user = this;

  // first check if the box belongs to this user
  if (!user.boxes) {
    throw new ModelError('User does not own this senseBox', { type: 'ForbiddenError' });
  }

  const userOwnsBox = user.boxes.some(b => b.equals(boxId));

  if (userOwnsBox === false) {
    throw new ModelError('User does not own this senseBox', { type: 'ForbiddenError' });
  }

  return true;
};

userSchema.methods.removeBox = function removeBox (boxId) {
  const user = this;

  return Box.findById(boxId)
    .exec()
    .then(function (box) {
      if (!box) {
        return Promise.reject('coudn\'t remove, senseBox not found');
      }

      // remove box and measurements
      box.removeSelfAndMeasurements()
        .catch(function (err) {
          Honeybadger.notify(err);
        });


      // remove from boxes
      user.boxes.pull({ _id: boxId });
      postToSlack(`Box deleted: ${user.name} (${redactEmail(user.email)}) just deleted "${box.name}" (${box.model})`);

      return user.save();
    });
};

userSchema.methods.destroyUser = function destroyUser (req) {
  const user = this;
  // sign out
  user.signOut(req);

  return user
    .populate('boxes')
    .execPopulate()
    .then(function (userWithBoxes) {
      userWithBoxes.mail('deleteUser');
      postToSlack(`User deleted: ${user.name} (${redactEmail(user.email)})`);
      // delete the boxes..
      for (const box of userWithBoxes.boxes) {
        box.removeSelfAndMeasurements();
      }

      return userWithBoxes.remove();
    });
};

userSchema.methods.resendEmailConfirmation = function resendEmailConfirmation () {
  const user = this;

  if (user.emailIsConfirmed === true) {
    return Promise.resolve({ isConfirmed: true });
  }

  user.set('emailConfirmationToken', uuid());

  return user.save()
    .then(function (savedUser) {
      savedUser.mail('resendEmailConfirmation');

      return savedUser;
    });
};

userSchema.methods.updateUser = function updateUser ({ email, language, name, currentPassword, newPassword }) {
  const user = this;

  // don't allow email and password change in one request
  if (email && newPassword) {
    return Promise.reject(new ModelError('You cannot change your email address and password in the same request.'));
  }

  // create a promise which resolves with true. needed if there is no password change
  let updatePromise = Promise.resolve(true);

  // for password and email changes, require parameter currentPassword to be valid.
  if ((newPassword && newPassword !== '') || (email && email !== '')) {
    // check if the request includes the old password
    if (!currentPassword || currentPassword === '') {
      return Promise.reject(new ModelError('To change your password or email address, please supply your current password.'));
    }
    updatePromise = user.checkPassword(currentPassword);

    // check new password against password rules
    if (newPassword && user.schema.statics.validatePassword(newPassword) === false) {
      return Promise.reject(new ModelError('New password should have at least 8 characters'));
    }
  }

  const msgs = [];
  let signOut = false,
    somethingsChanged = false;

  return updatePromise
    .then(function (oldPasswordIsCorrect) {
      if (oldPasswordIsCorrect === false) {
        throw new Error('Password not correct.');
      }

      // at this point its clear the user is allowed to change the details of their profile

      // we only set changed properties
      if (name && name !== '' && user.name !== name) {
        user.set('name', name);
        somethingsChanged = true;
      }

      if (language && language !== '' && user.language !== language) {
        user.set('language', language);
        somethingsChanged = true;
      }

      if (email && email !== '' && user.email !== email) {
        user.set('newEmail', email);
        msgs.push(' E-Mail changed. Please confirm your new address. Until confirmation, sign in using your old address');
        somethingsChanged = true;
      }

      // at this point its also clear the new password conforms to the password rules
      if (newPassword && newPassword !== '') {
        user.set('password', newPassword);
        msgs.push(' Password changed. Please log in with your new password');
        signOut = true;
        somethingsChanged = true;
      }

      if (somethingsChanged === false) {
        return { updated: false };
      }

      // save user
      return user.save();
    })
    .then(function (updatedUser) {
      return { updated: true, signOut, messages: msgs, updatedUser };
    })
    .catch(function (err) {
      if (err && err.errors && err.errors.unconfirmedEmail) {
        throw new ModelError(`New email address invalid or an user with the email address ${email} already exists.`, { type: 'UnprocessableEntityError' });
      }

      throw err;
    });
};

userSchema.methods.getBoxes = function getBoxes () {
  return this
    .populate('boxes')
    .execPopulate()
    .then(function (user) {
      return user.boxes.map(b => b.toJSON({ includeSecrets: true }));
    });
};

userSchema.statics.confirmEmail = function confirmEmail ({ token, email }) {
  return this.findOne({ $and: [ { $or: [ { email: email }, { unconfirmedEmail: email } ] }, { emailConfirmationToken: token } ] })
    .exec()
    .then(function (user) {
      if (!user) {
        throw new ModelError('invalid email confirmation token', { type: 'ForbiddenError' });
      }

      // mark user as confirmed
      user.set('emailConfirmationToken', undefined);
      user.set('emailIsConfirmed', true);
      user.set('unconfirmedEmail', undefined);

      return user.save();
    });
};

userSchema.statics.resetPassword = function resetPassword ({ password, token }) {
  return this.findOne({ resetPasswordToken: token })
    .exec()
    .then(function (user) {
      if (!user) {
        throw new ModelError('Password reset for this user not possible', { type: 'ForbiddenError' });
      }

      if (moment.utc().isAfter(moment.utc(user.resetPasswordExpires))) {
        throw new ModelError('Password reset token expired', { type: 'ForbiddenError' });
      }

      // set user specified password..
      // also changes the passwordResetToken
      user.set('password', password);

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
