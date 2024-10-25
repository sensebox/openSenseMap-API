'use strict';

const moment = require('moment');
const { eq } = require('drizzle-orm');
const { tokenBlacklistTable } = require('../../schema/schema');
const { db } = require('../drizzle');

const insertTokenToBlacklist = async function (hash, token) {
  await db.insert(tokenBlacklistTable).values({
    hash,
    token,
    expiresAt: moment.unix(token.exp)
  });
};

const findToken = async function (hash) {
  const blacklistedToken = await db.select().from(tokenBlacklistTable)
    .where(eq(tokenBlacklistTable.hash, hash));

  return blacklistedToken;
};

module.exports = {
  findToken,
  insertTokenToBlacklist
};
