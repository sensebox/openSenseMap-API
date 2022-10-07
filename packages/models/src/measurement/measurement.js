'use strict';

const { mongoose } = require('../db'),
  moment = require('moment'),
  decodeHandlers = require('./decoding'),
  ModelError = require('../modelError'),
  { schema: locationSchema } = require('../location/location');

const measurementSchema = new mongoose.Schema(
  {
    value: {
      type: String,
      required: true,
    },
    sensor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sensor',
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
      default: moment.utc().toDate(),
    },
    location: {
      type: locationSchema,
      required: false,
    },
  },
  { usePushEach: true }
);

measurementSchema.index({ sensor_id: 1, createdAt: -1 });

measurementSchema.set('toJSON', {
  version: false,
  transform: function transform (doc, ret) {
    delete ret._id;

    return ret;
  }
});

measurementSchema.statics.decodeMeasurements = function decodeMeasurements (measurements, { contentType = 'json', sensors } = {}) {
  return decodeHandlers[contentType].decodeMessage(measurements, { sensors })
    .catch(function (err) {
      throw new ModelError(err.message, { type: 'UnprocessableEntityError' });
    });
};

measurementSchema.statics.hasDecoder = function hasDecoder (contentType) {
  if (!decodeHandlers[contentType]) {
    return false;
  }

  return true;
};

measurementSchema.statics.findLatestMeasurementsForSensors = function findLatestMeasurementsForSensors (fromDate, toDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: {
          '$gt': fromDate.toDate(),
          '$lt': toDate.toDate()
        }
      }
    },
    {
      $group: {
        _id: '$sensor_id',
        value: { $first: '$value' },
        createdAt: { $first: '$createdAt' },
        sensor_id: { $first: '$sensor_id' }
      },
    },
    { $project: { value: 1, createdAt: 1, sensor_id: 1, _id: 0 } }
  ])
    .exec();
};

measurementSchema.statics.getMeasurementsStream = function getMeasurementsStream ({ fromDate, toDate, sensorId }) {
  const queryLimit = 10000;

  const qry = {
    sensor_id: sensorId,
    createdAt: {
      $gte: fromDate.toDate(),
      $lte: toDate.toDate()
    }
  };

  return this
    .find(qry, { 'createdAt': 1, 'value': 1, 'location': 1, '_id': 0 })
    .cursor({ lean: true, limit: queryLimit, sort: { createdAt: -1 } });
};

const measurementModel = mongoose.model('Measurement', measurementSchema);

module.exports = {
  schema: measurementSchema,
  model: measurementModel
};
