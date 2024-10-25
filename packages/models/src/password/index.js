'use strict';

const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const { eq } = require('drizzle-orm');

const { passwordResetTable, passwordTable } = require('../../schema/schema');
const { db } = require('../drizzle');
const ModelError = require('../modelError');
const { validatePassword, passwordHasher } = require('./utils');

const { min_length: password_min_length } = require('config').get('openSenseMap-API-models.password');

const findByUserId = async function findByUserId (userId) {
  const password = await db.query.passwordTable.findFirst({
    where: (password, { eq }) => eq(password.userId, userId)
  });

  return password;
};

const initPasswordReset = async function initPasswordReset ({ email }) {
  const user = await db.query.userTable.findFirst({
    where: (user, { eq }) => eq(user.email, email.toLowerCase())
  });

  if (!user) {
    throw new ModelError('Password reset for this user not possible', {
      type: 'ForbiddenError'
    });
  }

  // Create entry with default values
  await db
    .insert(passwordResetTable)
    .values({ userId: user.id })
    .onConflictDoUpdate({
      target: passwordResetTable.userId,
      set: {
        token: uuidv4(),
        expiresAt: moment.utc().add(12, 'hours')
          .toDate()
      }
    });
};

const resetOldPassword = async function resetOldPassword ({ password, token }) {
  const passwordReset = await db.query.passwordResetTable.findFirst({
    where: (reset, { eq }) => eq(reset.token, token)
  });

  if (!passwordReset) {
    throw new ModelError('Password reset for this user not possible', {
      type: 'ForbiddenError'
    });
  }

  if (moment.utc().isAfter(moment.utc(passwordReset.expiresAt))) {
    throw new ModelError('Password reset token expired', {
      type: 'ForbiddenError'
    });
  }

  // Validate new Password
  if (validatePassword(password) === false) {
    throw new ModelError(
      `Password must be at least ${password_min_length} characters.`
    );
  }

  // Update reset password
  const hashedPassword = await passwordHasher(password);
  await db
    .update(passwordTable)
    .set({ hash: hashedPassword })
    .where(eq(passwordTable.userId, passwordReset.userId));

  // invalidate password reset token
  await db
    .delete(passwordResetTable)
    .where(eq(passwordResetTable.token, token));

  // TODO: invalidate refreshToken and active accessTokens
};

module.exports = {
  findByUserId,
  initPasswordReset,
  resetOldPassword
};
