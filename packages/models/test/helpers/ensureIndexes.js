'use strict';

const { User, Box, Measurement, Claim } = require('../../index');

module.exports = function () {
  return Promise.all([
    User.createIndexes(),
    Box.createIndexes(),
    Measurement.createIndexes(),
    Claim.createIndexes()
  ]);
};
