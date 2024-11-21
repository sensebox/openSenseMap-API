'use strict';

const { eq } = require('drizzle-orm');
const { refreshTokenTable } = require('../../schema/schema');
const { db } = require('../drizzle');

const addRefreshToken = async function addRefreshToken (userId, token, expiresAt) {
  await db.insert(refreshTokenTable).values({
    userId,
    token,
    expiresAt
  });
};

const deleteRefreshToken = async function deleteRefreshToken (hash) {
  await db.delete(refreshTokenTable).where(eq(refreshTokenTable.token, hash));
};

const findRefreshTokenUser = async function findRefreshTokenUser (token) {
  const token1 = await db.query.refreshTokenTable.findFirst({
    where: (refreshToken, { eq }) => eq(refreshToken.token, token),
    with: {
      user: true
    }
  });

  return token1.user;
};

module.exports = {
  addRefreshToken,
  deleteRefreshToken,
  findRefreshTokenUser
};
