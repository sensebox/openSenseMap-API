'use strict';

const restify = require('restify'),
  models = require('../models'),
  Honeybadger = require('../utils').Honeybadger;

const { Measurement, Box } = models;

const deleteSensorData = function deleteSensorData (req, res, next) {
  const { boxId, sensorId } = req._userParams;

  if (boxId && sensorId) {
    const query = {
      sensor_id: sensorId
    };

    // delete measurements
    Measurement.find(query)
      .remove()
      .exec()
      .then(function () {
        // update lastMeasurement field in Box
        return Box.findById(boxId)
          .populate('sensor.lastMeasurement')
          .exec();
      })
      .then(function (box) {
        for (const sensor of box.sensors) {
          if (sensor._id.equals(sensorId)) {
            sensor.lastMeasurement = undefined;
          }
        }
      })
      .catch(function (err) {
        console.log(err);
        Honeybadger.notify(err);

        return next(new restify.InternalServerError(err));
      });


  } else {
    return next(new restify.UnprocessableEntityError('missing required parameters boxId or sensorId'));
  }

  res.send(200, { code: 200, message: `Successfully deleted all measurements of sensor ${sensorId} of senseBox ${boxId}` });
};

module.exports = {
  deleteSensorData: [
    deleteSensorData
  ]
};
