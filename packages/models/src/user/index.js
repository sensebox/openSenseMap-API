'use strict';

const bcrypt = require('bcrypt');
const crypto = require('crypto');

const { userTable, passwordTable } = require('../../schema/schema');
const { db } = require('../drizzle');
const { createProfile } = require('../profile/profile');
const { eq } = require('drizzle-orm');
const ModelError = require('../modelError');
const { checkPassword, validatePassword } = require('../password/utils');

// Configuration
const { min_length: password_min_length, salt_factor: password_salt_factor } = require('config').get('openSenseMap-API-models.password');

const preparePasswordHash = function preparePasswordHash (plaintextPassword) {
  // first round: hash plaintextPassword with sha512
  const hash = crypto.createHash('sha512');
  hash.update(plaintextPassword.toString(), 'utf8');
  const hashed = hash.digest('base64'); // base64 for more entropy than hex

  return hashed;
};

const passwordHasher = function passwordHasher (plaintextPassword) {
  return bcrypt.hash(
    preparePasswordHash(plaintextPassword),
    Number(password_salt_factor)
  ); // signature <String, Number> generates a salt and hashes in one step
};

const createUser = async function createUser (name, email, password, language) {
  try {
    const hashedPassword = await passwordHasher(password);
    const user = await db
      .insert(userTable)
      .values({ name, email, language })
      .returning();

    await db.insert(passwordTable).values({
      hash: hashedPassword,
      userId: user[0].id
    });

    await createProfile(user[0]);

    // TODO: Only return specific fields
    return user[0];
  } catch (error) {
    console.log(error);
  }
};

// TODO: delete User
const deleteUser = async function deleteUser () {};

const updateUser = async function updateUser (
  userId,
  { email, language, name, currentPassword, newPassword, integrations }
) {
  // don't allow email and password change in one request
  if (email && newPassword) {
    return Promise.reject(
      new ModelError(
        'You cannot change your email address and password in the same request.'
      )
    );
  }

  // for password and email changes, require parameter currentPassword to be valid.
  if ((newPassword && newPassword !== '') || (email && email !== '')) {
    // check if the request includes the old password
    if (!currentPassword) {
      return Promise.reject(
        new ModelError(
          'To change your password or email address, please supply your current password.'
        )
      );
    }
    await checkPassword(currentPassword);

    // check new password against password rules
    if (newPassword && validatePassword(newPassword) === false) {
      return Promise.reject(
        new ModelError('New password should have at least 8 characters')
      );
    }
  }

  // at this point its clear the user is allowed to change the details of their profile
  const setColumns = {};

  const msgs = [];
  let signOut = false,
    somethingsChanged = false;

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
    msgs.push(
      ' E-Mail changed. Please confirm your new address. Until confirmation, sign in using your old address'
    );
    somethingsChanged = true;
  }

  // at this point its also clear the new password conforms to the password rules
  if (newPassword) {
    user.set('password', newPassword);
    msgs.push(' Password changed. Please sign in with your new password');
    signOut = true;
    somethingsChanged = true;
  }

  const user = await db
    .update(userTable)
    .set(setColumns)
    .where(eq(userTable.id, userId))
    .returning();

  return user[0];
};

module.exports = {
  createUser,
  deleteUser,
  updateUser
};
