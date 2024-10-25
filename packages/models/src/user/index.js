'use strict';

const { userTable, passwordTable } = require('../../schema/schema');
const { db } = require('../drizzle');
const { createProfile } = require('../profile/profile');
const { eq } = require('drizzle-orm');
const ModelError = require('../modelError');
const { checkPassword, validatePassword, passwordHasher } = require('../password/utils');

const findUserByNameOrEmail = async function findUserByNameOrEmail (
  emailOrName
) {
  return db.query.userTable.findFirst({
    where: (user, { eq, or }) =>
      or(eq(user.email, emailOrName.toLowerCase()), eq(user.name, emailOrName)),
    with: {
      password: true
    }
  });
};

const findUserByEmailAndRole = async function findUserByEmailAndRole ({
  email,
  role
}) {
  const user = await db.query.userTable.findFirst({
    where: (user, { eq, and }) =>
      and(eq(user.email, email.toLowerCase(), eq(user.role, role)))
  });

  return user;
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
  findUserByNameOrEmail,
  findUserByEmailAndRole,
  createUser,
  deleteUser,
  updateUser
};
