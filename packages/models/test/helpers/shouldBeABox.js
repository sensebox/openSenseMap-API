'use strict';

const { expect } = require('chai'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  parseISO8601 = require('./iso8601'),
  checkBoxLocation = require('./checkBoxLocation');

const shouldBeABox = function shouldBeABox (box) {
  expect(mongoose.Types.ObjectId.isValid(box._id)).true;
  expect(parseISO8601(box.createdAt).isValid()).true;
  expect(parseISO8601(box.createdAt).isBefore(moment.utc())).true;
  expect(parseISO8601(box.updatedAt).isValid()).true;
  expect(parseISO8601(box.updatedAt).isBefore(moment.utc())).true;
  expect(box.name).not.empty;
  expect(box.exposure).not.empty;
  expect(box.model).not.empty;

  checkBoxLocation(box.currentLocation);

  expect(box.sensors).an('array');
  for (const sensor of box.sensors) {
    expect(sensor.title).not.empty;
    expect(sensor.unit).not.empty;
    expect(sensor.sensorType).not.empty;
    expect(mongoose.Types.ObjectId.isValid(sensor._id)).true;
  }

  return box;
};

module.exports = shouldBeABox;
