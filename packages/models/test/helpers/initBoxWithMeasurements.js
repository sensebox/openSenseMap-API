'use strict';

const { Box, Measurement } = require('../../index'),
  senseBox = require('./senseBox'),
  shouldBeABoxWithSecrets = require('./shouldBeABoxWithSecrets');

const initBoxWithMeasurements = function initBoxWithMeasurements () {
  let thebox;

  return Box.initNew(senseBox())
    .then(shouldBeABoxWithSecrets)
    .then(function (box) {
      thebox = box;

      return Measurement.decodeMeasurements(box.sensors.map(s => { return { sensor_id: s._id.toString(), value: 2 }; }));
    })
    .then(function (msmts) {
      return thebox.saveMeasurementsArray(msmts);
    })
    .then(function () {
      return Box.findById(thebox._id);
    });
};

module.exports = initBoxWithMeasurements;
