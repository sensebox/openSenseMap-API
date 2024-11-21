'use strict';

const bcrypt = require('bcrypt');
const crypto = require('crypto');

const ModelError = require('../modelError');

const { min_length: password_min_length, salt_factor: password_salt_factor } = require('config').get('openSenseMap-API-models.password');

const preparePasswordHash = function preparePasswordHash (plaintextPassword) {
  // first round: hash plaintextPassword with sha512
  const hash = crypto.createHash('sha512');
  hash.update(plaintextPassword.toString(), 'utf8');
  const hashed = hash.digest('base64'); // base64 for more entropy than hex

  return hashed;
};

const checkPassword = function checkPassword (
  plaintextPassword,
  hashedPassword
) {
  return bcrypt
    .compare(preparePasswordHash(plaintextPassword), hashedPassword.hash)
    .then(function (passwordIsCorrect) {
      if (passwordIsCorrect === false) {
        throw new ModelError('Password incorrect', { type: 'ForbiddenError' });
      }

      return true;
    });
};

const validatePassword = function validatePassword (newPassword) {
  return newPassword.length >= Number(password_min_length);
};

const passwordHasher = function passwordHasher (plaintextPassword) {
  return bcrypt.hash(
    preparePasswordHash(plaintextPassword),
    Number(password_salt_factor)
  ); // signature <String, Number> generates a salt and hashes in one step
};

module.exports = {
  checkPassword,
  validatePassword,
  passwordHasher
};
