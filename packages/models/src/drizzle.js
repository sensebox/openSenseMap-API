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
  measurementTable,
  locationTable,
  locationRelations,
  deviceToLocationTable,
  deviceToLocationRelations,
  logEntryTable,
  logEntryRelations,
  tokenBlacklistTable
} = require('../schema/schema');
const { sql } = require('drizzle-orm');

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

const isReady = async function isReady () {
  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    throw new Error(error);
  }
};

const pool = new Pool({
  connectionString: getDBUri(),
  ssl: config.get('ssl') === 'true' ? true : false
});

// TODO: attach event listener
// pool.on('connect', () => {
//   console.log('connected to the db');
// });

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
  refreshTokenRelations,
  locationTable,
  locationRelations,
  deviceToLocationTable,
  deviceToLocationRelations,
  logEntryTable,
  logEntryRelations,
  tokenBlacklistTable
};

const db = drizzle(pool, {
  schema
});

module.exports = {
  db,
  isReady
};
// module.exports.db = db;
// module.exports.isReady = isReady;
