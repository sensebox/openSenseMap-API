'use strict';

const { expect } = require('chai'),
  shouldBeABox = require('./shouldBeABox'),
  checkBoxLocation = require('./checkBoxLocation');

const shouldBeABoxWithSecrets = function (box) {
  shouldBeABox(box);
  expect(box.integrations).an('object');

  return box;
};

module.exports = shouldBeABoxWithSecrets;
