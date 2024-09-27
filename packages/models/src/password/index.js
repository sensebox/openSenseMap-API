'use strict';

const { db } = require('../drizzle');

const findByUserId = async function findByUserId (userId) {
  const password = await db.query.passwordTable.findFirst({
    where: (password, { eq }) => eq(password.userId, userId)
  });

  return password;
};

module.exports = {
  findByUserId
};
