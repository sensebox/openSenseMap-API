'use strict';

const { expect } = require('chai'),
  shouldBeABox = require('./shouldBeABox');

const shouldBeABoxWithSecrets = function (box) {
  shouldBeABox(box);
  expect(box.integrations).an('object');
  expect(box.access_token).to.be.a('string');

  return box;
};

module.exports = shouldBeABoxWithSecrets;
