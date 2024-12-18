'use strict';

const config = require('config').get('openSenseMap-API-models.db');

const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const {
  deviceTable,
  sensorTable,
  userTable,
  passwordTable,
  passwordResetTable,
  profileTable,
  profileImageTable,
  deviceRelations,
  sensorRelations,
  userRelations,
  profileRelations,
  accessTokenRelations,
  accessTokenTable,
  refreshTokenRelations,
  refreshTokenTable,
  measurementTable
} = require('../schema/schema');

const getDBUri = function getDBUri (uri) {
  // if available, use user specified db connection uri
  if (uri) {
    return uri;
  }

  // get uri from config
  uri = config.get('database_url');
  if (uri) {
    return uri;
  }

  // otherwise build uri from config supplied values
  const { user, userpass, host, port, db } = config;

  return `postgresql://${user}:${userpass}@${host}:${port}/${db}`;
};

const pool = new Pool({
  connectionString: getDBUri()
});

const schema = {
  accessTokenTable,
  refreshTokenTable,
  deviceTable,
  sensorTable,
  userTable,
  passwordTable,
  passwordResetTable,
  measurementTable,
  profileTable,
  profileImageTable,
  deviceRelations,
  sensorRelations,
  userRelations,
  profileRelations,
  accessTokenRelations,
  refreshTokenRelations
};

const db = drizzle(pool, {
  schema
});

module.exports.db = db;
