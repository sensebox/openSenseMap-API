'use strict';

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
  accessTokenTable
} = require('../schema/schema');


const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/opensensemap'
});

const schema = {
  accessTokenTable,
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
  accessTokenRelations
};

const db = drizzle(pool, {
  schema
});

module.exports.db = db;
