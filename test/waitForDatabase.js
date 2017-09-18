'use strict';

const { db: { connect, mongoose } } = require('../index');

const success = function success () {
  mongoose.disconnect();
  process.exit();
};

connect()
  .then(success);

