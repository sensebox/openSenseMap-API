'use strict';

const config = require('config');

config.util.setModuleDefaults('opensensemap-migrations', {
  db: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    userpass: 'postgres',
    db: 'opensensemap',
    database_url: ''
  },
});

const getDBUri = function getDBUri () {
  // get uri from config
  const uri = config.get('opensensemap-migrations.db.database_url');
  if (uri) {
    return uri;
  }

  // otherwise build uri from config supplied values
  const { user, userpass, host, port, db } = config.get('opensensemap-migrations.db');

  return `postgresql://${user}:${userpass}@${host}:${port}/${db}`;
};

/** @type { import("drizzle-kit").Config } */
module.exports = {
  schema: './schema/*',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: getDBUri()
  }
};
