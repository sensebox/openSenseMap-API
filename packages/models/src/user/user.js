'use strict';

/**
 * Interesting reads:
 * https://blogs.dropbox.com/tech/2016/09/how-dropbox-securely-stores-your-passwords/
 * https://news.ycombinator.com/item?id=12548210
 * https://pulse.michalspacek.cz/passwords/storages
 *
 */

const { mongoose } = require('../db'),
  bcrypt = require('bcrypt'),
  crypto = require('crypto'),
  { min_length: password_min_length, salt_factor: password_salt_factor } = require('config').get('openSenseMap-API-models.password'),
  { v4: uuidv4 } = require('uuid'),
  { model: Box } = require('../box/box'),
  { model: Claim } = require('../box/claim'),
  mails = require('./mails'),
  moment = require('moment'),
  timestamp = require('mongoose-timestamp'),
  ModelError = require('../modelError'),
  isemail = require('isemail');

const userNameRequirementsText = 'Parameter name must consist of at least 3 and up to 40 alphanumerics (a-zA-Z0-9), dot (.), dash (-), underscore (_) and spaces.',
  userEmailRequirementsText = 'Parameter {PATH} is not a valid email address.';

const nameValidRegex = /^[^~`!@#$%^&*()+=£€{}[\]|\\:;"'<>,?/\n\r\t\s][^~`!@#$%^&*()+=£€{}[\]|\\:;"'<>,?/\n\r\t]{1,39}[^~`!@#$%^&*()+=£€{}[\]|\\:;"'<>,?/\n\r\t\s]$/;

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    minlength: [3, userNameRequirementsText],
    maxlength: [40, userNameRequirementsText],
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
  sharedBoxes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Box'
  }],
  language: {
    type: String,
    trim: true,
    default: 'en_US',
    validate: {
      /* eslint-disable func-name-matching */
      validator: function validateLanguage (lang) {
        return /^[a-z]{1,3}((-|_)[a-z]{1,3})?$/i.test(lang);
      },
      /* eslint-enable func-name-matching */
      message: 'Parameter language only allows ISO 639-1 and ISO639-2 language codes'
    }
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
  emailConfirmationToken: { type: String, default: uuidv4 },
  emailIsConfirmed: { type: Boolean, default: false, required: true },
  refreshToken: { type: String },
  refreshTokenExpires: { type: Date }
}, { usePushEach: true });
userSchema.plugin(timestamp);

const toJSONProps = ['name', 'email', 'role', 'language', 'boxes', 'emailIsConfirmed'],
  toJSONSecretProps = ['_id', 'unconfirmedEmail', 'lastUpdatedBy', 'createdAt', 'updatedAt'];

// only send out names and email..
userSchema.set('toJSON', {
  version: false,
  transform: function transform (doc, ret, options) {
    const user = {};

    let propsToUse = toJSONProps;
    if (options && options.includeSecrets) {
      propsToUse = [...propsToUse, ...toJSONSecretProps];
    }

    for (const prop of propsToUse) {
      user[prop] = ret[prop];
    }

    return user;
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
  hash.update(plaintextPassword.toString(), 'utf8');
  const hashed = hash.digest('base64'); // base64 for more entropy than hex

  return hashed;
};

const passwordHasher = function passwordHasher (plaintextPassword) {
  return bcrypt.hash(preparePasswordHash(plaintextPassword), Number(password_salt_factor)); // signature <String, Number> generates a salt and hashes in one step
};

userSchema.statics.validatePassword = function validatePassword (newPassword) {
  return newPassword.length >= Number(password_min_length);
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
        .count({ $or: [{ email: user._newEmail }, { unconfirmedEmail: user._newEmail }] })
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

    return;
  }

  if (user.unconfirmedEmail) {
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
  return bcrypt.compare(preparePasswordHash(plaintextPassword), this.hashedPassword)
    .then(function (passwordIsCorrect) {
      if (passwordIsCorrect === false) {
        throw new ModelError('Password incorrect', { type: 'ForbiddenError' });
      }

      return true;
    });
};

userSchema.statics.initPasswordReset = function initPasswordReset ({ email }) {
  return this.findOne({ email: email.toLowerCase() })
    .exec()
    .then(function (user) {
      if (!user) {
        throw new ModelError('Password reset for this user not possible', { type: 'ForbiddenError' });
      }

      return user.passwordReset();
    });
};

userSchema.methods.passwordReset = function passwordReset () {
  const user = this;
  user.resetPasswordToken = uuidv4();
  user.resetPasswordExpires = moment.utc()
    .add(12, 'hours')
    .toDate();

  return user.save()
    .then(function (savedUser) {
      return savedUser.mail('passwordReset');
    });
};
// ---- End Password stuff -----

userSchema.methods.addBox = function addBox (params) {
  const user = this;
  const serialPort = params.serialPort;

  // initialize new box
  return Box.initNew(params)
    .then(function (savedBox) {
      // request is valid
      // persist the saved box in the user
      savedBox.serialPort = serialPort;
      user.boxes.addToSet(savedBox._id);
      if (params.sharedBox) {
        user.sharedBoxes.addToSet(savedBox._id);
      }

      return user.save()
        .then(function () {
          let mailTemplate = 'newBox';
          if (savedBox.model && savedBox.model.toString().includes('luftdaten')) {
            mailTemplate = 'newBoxLuftdaten';
          }

          if (savedBox.model && savedBox.model.toString().includes('hackair')) {
            mailTemplate = 'newBoxHackAir';
          }

          user.mail(mailTemplate, savedBox);

          return savedBox.toJSON({ includeSecrets: true });
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

  // checkBoxOwner throws ModelError
  user.checkBoxOwner(boxId);

  return Box.findById(boxId)
    .exec()
    .then(function (box) {
      if (!box) {
        return Promise.reject(new ModelError('coudn\'t remove, senseBox not found', { type: 'NotFoundError' }));
      }

      // remove box and measurements
      box.removeSelfAndMeasurements()
        .catch(function (err) {
          throw err;
        });


      // remove from boxes
      user.boxes.pull({ _id: boxId });

      return user.save()
        .then(function () {
          return box;
        });

    });
};

userSchema.methods.transferBox = function transferBox (boxId, date) {
  const user = this;

  // checkBoxOwner throws ModelError
  user.checkBoxOwner(boxId);

  return Claim.initClaim(boxId, date)
    .then(function (claim) {
      return claim;
    });
};

userSchema.methods.updateTransfer = function updateTransfer (boxId, token, date) {
  const user = this;

  // checkBoxOwner throws ModelError
  user.checkBoxOwner(boxId);

  return Claim.findClaimByToken(token)
    .exec()
    .then(function (claim) {
      if (!claim) {
        return Promise.reject(
          new ModelError('Coudn\'t update, token not found', {
            type: 'NotFoundError',
          })
        );
      }

      claim.set('expiresAt', date);

      return claim.save();
    });
};

userSchema.methods.removeTransfer = function removeTransfer (boxId, token) {
  const user = this;

  // checkBoxOwner throws ModelError
  user.checkBoxOwner(boxId);

  return Claim.findClaimByToken(token)
    .exec()
    .then(function (claim) {
      if (!claim) {
        return Promise.reject(new ModelError('Coudn\'t remove, token not found', { type: 'NotFoundError' }));
      }

      // remove token
      return claim.remove();
    });
};

userSchema.methods.claimBox = function claimBox (token) {
  const user = this;

  return Claim.findClaimByToken(token)
    .exec()
    .then(function (claim) {

      if (!claim) {
        return Promise.reject(new ModelError('Token was not found', { type: 'NotFoundError' }));
      }

      return {
        owner: user.id,
        claim
      };
    })
    .catch(function (error) {
      throw new ModelError(error.message, token);
    });
};

userSchema.methods.destroyUser = function destroyUser ({ sendMail } = { sendMail: true }) {
  return this
    .populate('boxes')
    .execPopulate()
    .then(function (userWithBoxes) {
      if (sendMail) {
        userWithBoxes.mail('deleteUser');
      }
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
    return Promise.reject(new ModelError(`Email address ${user.email} is already confirmed.`, { type: 'UnprocessableEntityError' }));
  }

  user.set('emailConfirmationToken', uuidv4());

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
    if (!currentPassword) {
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
      if (name && user.name !== name) {
        user.set('name', name);
        somethingsChanged = true;
      }

      if (language && user.language !== language) {
        user.set('language', language);
        somethingsChanged = true;
      }

      if (email && user.email !== email) {
        user.set('newEmail', email);
        msgs.push(' E-Mail changed. Please confirm your new address. Until confirmation, sign in using your old address');
        somethingsChanged = true;
      }

      // at this point its also clear the new password conforms to the password rules
      if (newPassword) {
        user.set('password', newPassword);
        msgs.push(' Password changed. Please sign in with your new password');
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

userSchema.methods.getBoxes = function getBoxes (page) {
  return Box.find({ _id: { $in: this.boxes } })
    .limit(25)
    .skip(page * 25)
    .populate(Box.BOX_SUB_PROPS_FOR_POPULATION)
    .then(function (boxes) {
      return boxes.map(b => b.toJSON({ includeSecrets: true }));
    });
};

userSchema.methods.getBox = function getBox (boxId) {
  const user = this;

  // checkBoxOwner throws ModelError
  user.checkBoxOwner(boxId);

  return Box.findOne({ _id: boxId })
    .populate(Box.BOX_SUB_PROPS_FOR_POPULATION)
    .then(function (box) {
      return box.toJSON({ includeSecrets: true });
    });
};

userSchema.methods.getSharedBoxes = function getSharedBoxes () {
  return Box.find({ _id: { $in: this.sharedBoxes } })
    .populate(Box.BOX_SUB_PROPS_FOR_POPULATION)
    .then(function (boxes) {
      return boxes.map((b) => b.toJSON({ includeSecrets: true }));
    });
};

userSchema.statics.confirmEmail = function confirmEmail ({ token, email }) {
  return this.findOne({ $and: [{ $or: [{ email: email }, { unconfirmedEmail: email }] }, { emailConfirmationToken: token }] })
    .exec()
    .then(function (user) {
      if (!user) {
        throw new ModelError('invalid email confirmation token', { type: 'ForbiddenError' });
      }

      // set email to email address from request
      user.set('email', email);

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

userSchema.statics.findUserOfBox = function findUserOfBox (boxId) {
  if (boxId._id) {
    boxId = boxId._id;
  }

  return this.findOne({ boxes: { $in: [boxId] } })
    .exec();
};

userSchema.statics.transferOwnershipOfBox = function transferOwnershipOfBox (newOwnerId, boxId) {
  const User = this;

  return Promise.all([User.findUserOfBox(boxId), User.findById(newOwnerId).exec()])
    .then(function ([originalOwner, newOwner]) {
      if (!newOwner) {
        throw new ModelError('New owner not found');
      }

      if (newOwner.boxes.indexOf(boxId) !== -1) {
        throw new ModelError('New owner already owns this box');
      }

      newOwner.boxes.addToSet(boxId);
      const promises = [newOwner.save()];

      if (originalOwner) {
        if (originalOwner.boxes.indexOf(boxId) === -1) {
          throw new ModelError('User does not own this box');
        }

        originalOwner.boxes.pull(boxId);
        promises.push(originalOwner.save());
      }

      return Promise.all(promises);
    });
};

userSchema.methods.mail = function mail (template, data) {
  // return mails.sendMail(template, this, data);
  return mails.addToQueue(template, this, data);
};

const handleE11000 = function (error, res, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    return next(new ModelError('Duplicate user detected'));
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
