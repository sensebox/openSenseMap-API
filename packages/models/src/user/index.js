'use strict';

const { v4: uuidv4 } = require('uuid');
const invariant = require('tiny-invariant');

const { userTable, passwordTable } = require('../../schema/schema');
const { db } = require('../drizzle');
const { createProfile } = require('../profile/profile');
const { eq } = require('drizzle-orm');
const ModelError = require('../modelError');
const { checkPassword, validatePassword, passwordHasher } = require('../password/utils');

const validateField = function validateField (field, expr, msg) {
  try {
    invariant(expr, msg);
  } catch (error) {
    const err = new Error(msg);
    err.name = 'ValidationError';
    err.errors = {
      [field]: { message: msg }
    };
    throw err;
  }
};

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
    with: {
      password: true
    },
    where: (user, { eq, and }) =>
      and(eq(user.email, email.toLowerCase(), eq(user.role, role)))
  });

  return user;
};

const createUser = async function createUser (name, email, password, language) {

  validateField('name', name.length > 0, 'Name is required');
  validateField('password', validatePassword(password), 'Password must be at least 8 characters');

  try {
    // TODO: Wrap this in a transaction
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
    throw error;
  }
};

const destroyUser = async function destroyUser (user) {
  return await db
    .delete(userTable)
    .where(eq(userTable.id, user.id))
    .returning({ name: userTable.name });
};

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

const confirmEmail = async function confirmEmail ({ token, email }) {

  const user = await findUserByNameOrEmail(email);

  if (!user) {
    throw new ModelError('invalid email confirmation token', {
      type: 'ForbiddenError'
    });
  }

  const updatedUser = await db.update(userTable).set({
    emailIsConfirmed: true,
    emailConfirmationToken: null
  })
    .where()
    .returning();

  return updatedUser[0];

  // return this.findOne({
  //   $and: [
  //     { $or: [{ email: email }, { unconfirmedEmail: email }] },
  //     { emailConfirmationToken: token }
  //   ]
  // })
  //   .exec()
  //   .then(function (user) {
  //     if (!user) {
  //       throw new ModelError('invalid email confirmation token', {
  //         type: 'ForbiddenError'
  //       });
  //     }

  //     // set email to email address from request
  //     user.set('email', email);

  //     // mark user as confirmed
  //     user.set('emailConfirmationToken', undefined);
  //     user.set('emailIsConfirmed', true);
  //     user.set('unconfirmedEmail', undefined);

  //     return user.save();
  //   });
};

const resendEmailConfirmation = async function resendEmailConfirmation (user) {
  if (user.emailIsConfirmed === true) {
    return Promise.reject(
      new ModelError(`Email address ${user.email} is already confirmed.`, {
        type: 'UnprocessableEntityError'
      })
    );
  }

  const savedUser = await db.update(userTable).set({
    emailConfirmationToken: uuidv4()
  })
    .returning();

  return savedUser[0];
  // user.set('emailConfirmationToken', uuidv4());

  // return user.save().then(function (savedUser) {
  //   savedUser.mail('resendEmailConfirmation');

  //   return savedUser;
  // });
};

module.exports = {
  findUserByNameOrEmail,
  findUserByEmailAndRole,
  createUser,
  destroyUser,
  updateUser,
  confirmEmail,
  resendEmailConfirmation
};
