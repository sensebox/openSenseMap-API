/* eslint-disable */
'use strict';

const models = require('../../../models');
const { mongoose, connect } = models.db;
const moment = require('moment');

const { Box } = models;

const migrate = function migrate () {
  const schemaVersion = mongoose.connection.db.collection('schemaVersion');

  console.log('Starting "set latest measurement timestamp" migration');

  return schemaVersion.find({})
    .next()
    .then(function (latestVersion) {
      if (latestVersion.schemaVersion !== 6) {
        throw new Error('Unexpected schema version... Exiting!');
      }

      return Box.find({}).populate({
        path: 'sensors.lastMeasurement', select: { value: 1, createdAt: 1, _id: 0 }
      }).exec();
    })
    .then(function (boxes) {

      const promises = [];
      for (let index = 0; index < boxes.length; index++) {
        const box = boxes[index];

        let timestamp;
        for (let index = 0; index < box.sensors.length; index++) {
          const sensor = box.sensors[index];

          if (sensor.lastMeasurement !== null) {
            if (sensor.lastMeasurement !== undefined) {
              if (timestamp === undefined ||
                moment(sensor.lastMeasurement.createdAt).isAfter(moment(timestamp)))
              {
                timestamp = sensor.lastMeasurement.createdAt;
              }
            }
          }

        }

        if (timestamp !== undefined) {
          box.set('lastMeasurementAt', timestamp);
          promises.push(box.save());
        }
      }

      return Promise.all(promises)
        .then(function () {
          console.log('Migration done!');

          return schemaVersion.update({}, { '$inc': { schemaVersion: 1 } });
        })
    });
}

// Connect to db and run migration
connect()
  .then(function () {
    migrate()
      .then(function () {
        mongoose.disconnect();
      })
      .catch(function (err) {
        console.log(err);
        mongoose.disconnect();
      });
  })
  .catch(function (err) {
    console.log(err);
  });