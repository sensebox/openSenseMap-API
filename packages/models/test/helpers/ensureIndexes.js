'use strict';

const { User, Box, Measurement } = require('../../index');

module.exports = function () {
  return Promise.all([
    User.ensureIndexes(),
    Box.ensureIndexes(),
    Measurement.ensureIndexes()
  ]);
};
