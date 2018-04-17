'use strict';

/* global describe it before after */
const expect = require('chai').expect,
  { db: { connect, mongoose }, User } = require('../../index'),
  dbConnectionString = require('../helpers/dbConnectionString'),
  moment = require('moment'),
  senseBox = require('../helpers/senseBox'),
  ensureIndexes = require('../helpers/ensureIndexes');

const shouldNotHappenThenner = function (err) {
  /* eslint-disable no-console */
  console.log(err);
  /* eslint-enable no-console */
  expect(false).true;
};

describe('User model', function () {
  before(function () {
    return connect(dbConnectionString({ db: 'userTest' }))
      .then(() => ensureIndexes());
  });

  after(function () {
    mongoose.disconnect();
  });

  describe('User creation', function () {
    it('should create a new user (User.create) with valid input', function () {
      return User.create({ name: 'Valid Username', password: 'long enough password', email: 'valid@email.com' })
        .then(function (user) {
          const id = user._id;

          return User.findById(id);
        })
        .then(function (user) {
          expect(user.name).equal('Valid Username');
          expect(user.email).equal('valid@email.com');
          expect(user.role).equal('user');
          expect(user.emailIsConfirmed).equal(false);
          expect(user.language).equal('en_US');
        });
    });

    it('should create a new user (new User) with valid input', function () {
      const user = new User({ name: 'Valid Username 2', password: 'long enough password', email: 'valid2@email.com' });

      return user.save()
        .then(function (user) {
          const id = user._id;

          return User.findById(id);
        })
        .then(function (user) {
          expect(user.name).equal('Valid Username 2');
          expect(user.email).equal('valid2@email.com');
          expect(user.role).equal('user');
          expect(user.emailIsConfirmed).equal(false);
          expect(user.language).equal('en_US');
        });
    });

    it('should lower case the email upon creation of an user', function () {
      return User.create({ name: 'Lowercase Email', password: 'long enough password', email: 'LoWeRcAsE@EmAiL.CoM' })
        .then(function (user) {
          const id = user._id;

          return User.findById(id);
        })
        .then(function (user) {
          expect(user.email).not.equal('LoWeRcAsE@EmAiL.CoM');
          expect(user.email).equal('lowercase@email.com');
        });
    });

    it('should not allow to register a user with same email', function () {
      return User.create({ name: 'Valid Username 3', password: 'long enough password', email: 'valid@email.com' })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal('Duplicate user detected');
        });
    });

    it('should not allow to register a user with same name', function () {
      return User.create({ name: 'Valid Username', password: 'long enough password', email: 'valid3@email.com' })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal('Duplicate user detected');
        });
    });

    it('should not allow to create new user with too short name', function () {
      return User.create({ name: 'sh', password: 'long enough password', email: 'valid@email.com' })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ValidationError');
          expect(err.message).equal('User validation failed: name: Parameter name must consist of at least 3 and up to 40 alphanumerics (a-zA-Z0-9), dot (.), dash (-), underscore (_) and spaces.');
        });
    });

    it('should not allow to create new user with invalid email', function () {
      return User.create({ name: 'Valid username 3', password: 'long enough password', email: 'not a valid email' })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ValidationError');
          expect(err.message).equal('User validation failed: email: Parameter email is not a valid email address.');
        });
    });

    it('should not allow to create new user with too short password', function () {
      return User.create({ name: 'Valid username 3', password: 'sh', email: 'valid3@email.com' })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ValidationError');
          expect(err.message).equal('User validation failed: password: must be at least 8 characters.');
        });
    });

    it('should allow to set the language when creating a user', function () {
      return User.create({ name: 'Language User', password: '12345678', email: 'lang@user.com', language: 'de_DE' })
        .then(function (user) {
          const id = user._id;

          return User.findById(id);
        })
        .then(function (user) {
          expect(user.language).equal('de_DE');
        });
    });

    it('should not allow to create an user with invalid language (1230)', function () {
      return User.create({ name: 'Invalid Language User', password: '12345678', email: 'invalid-lang@user.com', language: '1230' })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ValidationError');
          expect(err.message).equal('User validation failed: language: Parameter language only allows ISO 639-1 and ISO639-2 language codes');
        });
    });

    it('should not allow to create an user with invalid language (english)', function () {
      return User.create({ name: 'Invalid Language User', password: '12345678', email: 'invalid-lang@user.com', language: 'english' })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ValidationError');
          expect(err.message).equal('User validation failed: language: Parameter language only allows ISO 639-1 and ISO639-2 language codes');
        });
    });
  });

  describe('checkPassword', function () {
    it('should return true for correct password', function () {
      return User.findOne({ name: 'Valid Username' })
        .then(function (user) {
          return user.checkPassword('long enough password');
        })
        .then(function (passwordCorrect) {
          expect(passwordCorrect).true;
        });
    });

    it('should reject wrong password', function () {
      return User.findOne({ name: 'Valid Username' })
        .then(function (user) {
          return user.checkPassword('not correct password');
        })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal('Password incorrect');
        });
    });
  });

  describe('JSON serialization', function () {
    it('should only serialize _id, name, email, role, language, boxes emailIsConfirmed', function () {
      return User.findOne({ name: 'Valid Username' })
        .then(function (user) {
          const jsonUser = user.toJSON();
          expect(jsonUser._id).not.exist;
          expect(jsonUser.createdAt).not.exist;
          expect(jsonUser.updatedAt).not.exist;
          expect(jsonUser.resetPasswordExpires).not.exist;
          expect(jsonUser.resetPasswordToken).not.exist;
          expect(jsonUser.hashedPassword).not.exist;
          expect(jsonUser.__v).not.exist;
          expect(jsonUser.emailConfirmationToken).not.exist;
          expect(jsonUser.lastUpdatedBy).not.exist;
        });
    });

    it('should allow to serialize secret fields with "includeSecrets"', async function () {
      return User.findOne({ name: 'Valid Username' })
        .then(function (user) {
          const jsonUser = user.toJSON({ includeSecrets: true });
          expect(jsonUser._id).exist;
          expect(jsonUser.lastUpdatedBy).exist;
          expect(jsonUser.createdAt).exist;
          expect(jsonUser.updatedAt).exist;

          expect(jsonUser.resetPasswordExpires).not.exist;
          expect(jsonUser.resetPasswordToken).not.exist;
          expect(jsonUser.hashedPassword).not.exist;
          expect(jsonUser.__v).not.exist;
          expect(jsonUser.emailConfirmationToken).not.exist;
        });
    });
  });

  //({ email, language, name, currentPassword, newPassword }
  describe('Updating Users', function () {
    it('should not allow to update email of a User without password', function () {
      return User.findOne({ name: 'Valid Username' })
        .then(function (user) {
          return user.updateUser({ email: 'newemail@newprovider.com' });
        })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal('To change your password or email address, please supply your current password.');
        });
    });

    it('should not allow to update email of a User with wrong password', function () {
      return User.findOne({ name: 'Valid Username' })
        .then(function (user) {
          return user.updateUser({ email: 'newemail@newprovider.com', currentPassword: 'wrong password' });
        })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal('Password incorrect');
        });
    });

    it('should not allow to update email to something invalid', function () {
      return User.findOne({ name: 'Valid Username' })
        .then(function (user) {
          return user.updateUser({ email: 'invalid email address', currentPassword: 'long enough password' });
        })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal('New email address invalid or an user with the email address invalid email address already exists.');
        });
    });

    it('should not allow to update email to already registered user email', function () {
      return User.findOne({ name: 'Valid Username' })
        .then(function (user) {
          return user.updateUser({ email: 'valid2@email.com', currentPassword: 'long enough password' });
        })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal('New email address invalid or an user with the email address valid2@email.com already exists.');
        });
    });

    it('should allow to update email of a User with valid password', function () {
      return User.findOne({ name: 'Valid Username' })
        .then(function (user) {
          return user.updateUser({ email: 'newemail@newprovider.com', currentPassword: 'long enough password' });
        })
        .then(function ({ updated, signOut, messages, updatedUser }) {
          expect(updated).true;
          expect(signOut).false;
          expect(messages).to.be.an('array');
          expect(messages).to.include(' E-Mail changed. Please confirm your new address. Until confirmation, sign in using your old address');

          return User.findById(updatedUser._id);
        })
        .then(function (user) {
          expect(user.email).equal('valid@email.com');
          expect(user.unconfirmedEmail).equal('newemail@newprovider.com');
          expect(user.emailIsConfirmed).false;
        });
    });

    it('should allow to update language of a User', function () {
      return User.findOne({ name: 'Valid Username' })
        .then(function (user) {
          return user.updateUser({ language: 'de_DE' });
        })
        .then(function ({ updated, signOut, messages, updatedUser }) {
          expect(updated).true;
          expect(signOut).false;
          expect(messages).to.be.an('array');
          expect(messages).empty;

          return User.findById(updatedUser._id);
        })
        .then(function (user) {
          expect(user.language).equal('de_DE');
        });
    });

    it('should not allow to update password to too short password', function () {
      return User.findOne({ name: 'Valid Username' })
        .then(function (user) {
          return user.updateUser({ newPassword: '123', currentPassword: 'long enough password' });
        })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal('New password should have at least 8 characters');
        });
    });

    it('should allow to update password of a User', function () {
      return User.findOne({ name: 'Valid Username' })
        .then(function (user) {
          return user.updateUser({ newPassword: '12345678', currentPassword: 'long enough password' });
        })
        .then(function ({ updated, signOut, messages }) {
          expect(updated).true;
          expect(signOut).true;
          expect(messages).to.be.an('array');
          expect(messages).to.include(' Password changed. Please sign in with your new password');
        });
    });

    it('should return true for new updated password', function () {
      return User.findOne({ name: 'Valid Username' })
        .then(function (user) {
          return user.checkPassword('12345678');
        })
        .then(function (passwordCorrect) {
          expect(passwordCorrect).true;
        });
    });

    it('should throw error for old password', function () {
      return User.findOne({ name: 'Valid Username' })
        .then(function (user) {
          return user.checkPassword('long enough password');
        })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal('Password incorrect');
        });
    });

    it('should not allow to update password and email at the same time', function () {
      return User.findOne({ name: 'Valid Username' })
        .then(function (user) {
          return user.updateUser({ email: 'newemail@newprovider.com', newPassword: '87654321', currentPassword: 'long enough password' });
        })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal('You cannot change your email address and password in the same request.');
        });
    });

    it('should not allow to update name to already registered user name', function () {
      return User.findOne({ name: 'Valid Username' })
        .then(function (user) {
          return user.updateUser({ name: 'Valid Username 2', currentPassword: 'long enough password' });
        })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal('Duplicate user detected');
        });
    });

    it('should not allow to update name to too short username', function () {
      return User.findOne({ name: 'Valid Username' })
        .then(function (user) {
          return user.updateUser({ name: 's', currentPassword: 'long enough password' });
        })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ValidationError');
          expect(err.message).equal('User validation failed: name: Parameter name must consist of at least 3 and up to 40 alphanumerics (a-zA-Z0-9), dot (.), dash (-), underscore (_) and spaces.');
        });
    });

    it('should allow to update name of a User', function () {
      return User.findOne({ name: 'Valid Username' })
        .then(function (user) {
          return user.updateUser({ name: 'new Valid Username' });
        })
        .then(function ({ updated, signOut, messages, updatedUser }) {
          expect(updated).true;
          expect(signOut).false;
          expect(messages).to.be.an('array');
          expect(messages).empty;

          return User.findById(updatedUser._id);
        })
        .then(function (user) {
          expect(user.name).equal('new Valid Username');
        });
    });
  });

  describe('Password reset', function () {
    it('should not allow to request a password reset token for non existant user', function () {
      return User.initPasswordReset({ email: 'userdoesnotexist@email.com' })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal('Password reset for this user not possible');
        });
    });

    it('should not allow to reset password with wrong token', function () {
      return User.resetPassword({ token: 'Invalid password-reset token', password: '44445555' })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal('Password reset for this user not possible');
        });
    });

    it('should allow to initalize password reset', function () {
      let currentResetPasswordToken;

      return User.findOne({ name: 'Valid Username 2' })
        .then(function (user) {
          expect(user.resetPasswordToken).empty;
          expect(moment.utc(user.resetPasswordExpires).isBefore(moment.utc())).true;

          currentResetPasswordToken = user.resetPasswordToken;

          return User.initPasswordReset({ email: 'valid2@email.com' });
        })
        .then(function () {
          return User.findOne({ name: 'Valid Username 2' });
        })
        .then(function (user) {
          expect(user.resetPasswordToken).not.empty;
          expect(moment.utc(user.resetPasswordExpires).isAfter(moment.utc())).true;

          expect(user.resetPasswordToken).not.equal(currentResetPasswordToken);
        })
        .catch(shouldNotHappenThenner);
    });

    it('should not allow to reset password to too short password', function () {
      return User.initPasswordReset({ email: 'valid2@email.com' })
        .then(function () {
          return User.findOne({ name: 'Valid Username 2' });
        })
        .then(function (user) {
          expect(user.resetPasswordToken).not.empty;

          return User.resetPassword({ token: user.resetPasswordToken, password: '12' });
        })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ValidationError');
          expect(err.message).equal('User validation failed: password: must be at least 8 characters.');
        });
    });

    let someResetPasswordToken;
    it('should allow to reset password with correct token', function () {
      return User.initPasswordReset({ email: 'valid2@email.com' })
        .then(function () {
          return User.findOne({ name: 'Valid Username 2' });
        })
        .then(function (user) {
          expect(user.resetPasswordToken).not.empty;

          someResetPasswordToken = user.resetPasswordToken;

          return User.resetPassword({ token: user.resetPasswordToken, password: '56789012' });
        });
    });

    it('should return true for new password after password reset', function () {
      return User.findOne({ name: 'Valid Username 2' })
        .then(function (user) {
          return user.checkPassword('56789012');
        })
        .then(function (passwordCorrect) {
          expect(passwordCorrect).true;
        });
    });

    it('should throw error with old password', function () {
      return User.findOne({ name: 'Valid Username 2' })
        .then(function (user) {
          return user.checkPassword('12345678');
        })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal('Password incorrect');
        });
    });

    it('should not allow to reset password with used token', function () {
      return User.resetPassword({ token: someResetPasswordToken, password: '44445555' })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal('Password reset for this user not possible');
        });
    });
  });

  describe('Box management', function () {
    const boxes = [senseBox({ name: 'sb1' }), senseBox({ name: 'sb2' }), senseBox({ name: 'sb3' })];
    let userBoxes;
    before(function () {
      return User.findOne({ name: 'Valid Username 2' })
        .then(function (user) {
          return Promise.all(boxes.map(function (box) {
            return user.addBox(box);
          }));
        });
    });

    it('should allow to get all boxes with all details of a user', function () {
      return User.findOne({ name: 'Valid Username 2' })
        .then(function (user) {
          return user.getBoxes();
        })
        .then(function (boxes) {
          expect(boxes).to.be.an('array');
          expect(boxes.length).equal(boxes.length);

          for (const box of boxes) {
            expect(box.integrations).exist;
            expect(box.integrations.mqtt.enabled).false;
          }
          userBoxes = boxes;
        });
    });

    it('should allow to check if the user is the owner of a box', function () {
      return User.findOne({ name: 'Valid Username 2' })
        .then(function (user) {
          return user.checkBoxOwner(userBoxes[0]._id);
        })
        .then(function (userIsOwner) {
          expect(userIsOwner).true;
        });
    });

    it('should throw if the user is not the owner of a box', function () {
      return User.findOne({ name: 'Valid Username 2' })
        .then(function (user) {
          return user.checkBoxOwner(userBoxes[0].sensors[0]._id);// use some sensorId to fake boxID
        })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal('User does not own this senseBox');
        });
    });

    it('should throw if the user is not the owner of a box', function () {
      return User.findOne({ name: 'new Valid Username' })
        .then(function (user) {
          return user.checkBoxOwner(userBoxes[0].sensors[0]._id);// use some sensorId to fake boxID
        })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal('User does not own this senseBox');
        });
    });

    it('should not allow to remove a box if the user is not the owner', function () {
      return User.findOne({ name: 'new Valid Username' })
        .then(function (user) {
          return user.removeBox(userBoxes[0]._id);
        })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal('User does not own this senseBox');
        });
    });

    it('should allow to remove a box if the user is the owner', function () {
      let ctBoxes, currentUserBoxes, validUser;

      return User.findOne({ name: 'Valid Username 2' })
        .then(function (user) {
          ctBoxes = user.boxes.length;
          currentUserBoxes = user.boxes;
          validUser = user;

          return user.removeBox(userBoxes[0]._id);
        })
        .then(function () {
          expect(validUser.boxes.length).equal(ctBoxes - 1);
          expect(currentUserBoxes.every(b => b._i !== userBoxes[0]._id)).true;
        });
    });

    it('should allow to find the owner of a box with just the boxId', async function () {
      const user = await User.findOne({ name: 'Valid Username 2' });
      const boxId = user.boxes[0];

      const userByBoxId = await User.findUserOfBox(boxId);

      expect(user._id.toString()).equal(userByBoxId._id.toString());
    });

    it('should allow to transfer the ownership of a box', async function () {
      let oldOwner = await User.findOne({ name: 'Valid Username 2' });
      let newOwner = await User.findOne({ name: 'new Valid Username' });

      const boxId = oldOwner.boxes[0].toString();

      await User.transferOwnershipOfBox(newOwner._id, boxId);

      oldOwner = await User.findOne({ name: 'Valid Username 2' });
      newOwner = await User.findOne({ name: 'new Valid Username' });

      expect(oldOwner.boxes.every(b => b.toString() === boxId)).false;
      expect(newOwner.boxes.some(b => b.toString() === boxId)).true;

    });
  });

  describe('Email Confirmation', function () {
    it('should allow to request a new confirmation mail', function () {
      let someEmailConfirmationToken;

      return User.findOne({ name: 'Valid Username 2' })
        .then(function (user) {
          someEmailConfirmationToken = user.emailConfirmationToken;

          return user.resendEmailConfirmation();
        })
        .then(function (savedUser) {
          expect(savedUser.emailConfirmationToken).not.equal(someEmailConfirmationToken);
          someEmailConfirmationToken = savedUser.emailConfirmationToken;
        });
    });

    it('should allow to confirm email with valid token', function () {
      return User.findOne({ unconfirmedEmail: 'newemail@newprovider.com' })
        .then(function (user) {
          return User.confirmEmail({ token: user.emailConfirmationToken, email: 'newemail@newprovider.com' });
        })
        .then(function (user) {
          expect(user.emailConfirmationToken).not.exist;
          expect(user.email).equal('newemail@newprovider.com');
          expect(user.unconfirmedEmail).not.exist;
          expect(user.emailIsConfirmed).true;

          return User.findOne({ unconfirmedEmail: 'newemail@newprovider.com' });
        })
        .then(function (user) {
          expect(user).not.exist;
        });
    });

    it('should not allow to request a new confirmation mail for confirmed emailaddress', function () {
      return User.findOne({ email: 'newemail@newprovider.com' })
        .then(function (user) {
          return user.resendEmailConfirmation();
        })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal('Email address newemail@newprovider.com is already confirmed.');
        });
    });

    it('should not allow to confirm email with invalid token or unknown email', function () {
      return User.confirmEmail({ token: 'invalid token', email: 'unknownemail@provider.com' })
        .then(shouldNotHappenThenner)
        .catch(function (err) {
          expect(err.name).equal('ModelError');
          expect(err.message).equal('invalid email confirmation token');
        });
    });
  });

  describe('User deletion', function () {
    it('should allow to delete a user', function () {
      return User.findOne({ name: 'Valid Username 2' })
        .then(function (user) {
          return user.destroyUser();
        })
        .then(function () {
          return User.findOne({ name: 'Valid Username 2' });
        })
        .then(function (notExistantUser) {
          expect(notExistantUser).not.exist;
        });
    });
  });
});
