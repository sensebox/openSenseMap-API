'use strict';

const { expect } = require('chai'),
  parseISO8601 = require('./iso8601');

const checkBoxLocation = function checkBoxLocation (location) {
  expect(location).an('object');

  expect(location.type).equal('Point');

  expect(parseISO8601(location.timestamp).isValid()).true;

  expect(location.coordinates).an('array');

  expect(location.coordinates).lengthOf.within(2, 3);
  for (const coord of location.coordinates) {
    expect(coord).a('number');
  }
  expect(Math.abs(location.coordinates[0])).most(180);
  expect(Math.abs(location.coordinates[1])).most(90);
};

module.exports = checkBoxLocation;
