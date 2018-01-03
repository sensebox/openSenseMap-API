'use strict';

const createDbConnectionString = function createDbConnectionString ({
  db = 'test',
  host = 'db',
} = {}) {
  return `mongodb://${host}/${db}`;
};

module.exports = createDbConnectionString;
