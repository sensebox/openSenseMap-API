'use strict';

const { profileTable } = require('../../schema/schema');
const { db } = require('../drizzle');

const createProfile = async function createProfile (user) {

  const { name, id } = user;

  return db.insert(profileTable).values({
    username: name,
    public: false,
    userId: id
  });
};

module.exports = {
  createProfile: createProfile
};
