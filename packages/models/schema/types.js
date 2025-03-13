'use strict';

const { customType } = require('drizzle-orm/pg-core');

const bytea = customType({
  dataType () {
    return 'bytea';
  }
});

module.exports = {
  bytea
};
