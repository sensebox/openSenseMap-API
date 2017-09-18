'use strict';

const createDbConnectionString = function createDbConnectionString ({
  db = 'OSeM-api',
  host = 'localhost',
  port = 27017,
  user = 'senseboxapiuser',
  userpass = 'userpass',
  authsource = 'OSeM-api'
} = {}) {
  return `mongodb://${user}:${userpass}@${host}:${port}/${db}?authSource=${authsource}`;
};

module.exports = createDbConnectionString;
