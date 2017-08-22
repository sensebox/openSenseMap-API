'use strict';

const { mongoose } = require('../db'),
  Schema = mongoose.Schema,
  moment = require('moment'),
  decodeHandlers = require('../decoding'),
  ModelError = require('./modelError');

const measurementSchema = new Schema({
  value: {
    type: String,
    required: true
  },
  sensor_id: {
    type: Schema.Types.ObjectId,
    ref: 'Sensor',
    required: true
  },
  createdAt: {
    type: Date,
    required: true,
    default: moment.utc().toDate()
  },
  location: {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point'], // only 'Point' allowed
      required: true
    },
    coordinates: {
      type: [Number], // lng, lat, [height]
      required: true,
      validate: [function validateCoordLength (c) {
        return c.length === 2 || c.length === 3;
      }, '{PATH} has not length 2 or 3']
    }
  }
});

measurementSchema.index({ sensor_id: 1, createdAt: -1 });

measurementSchema.set('toJSON', {
  version: false,
  transform: function transform (doc, ret) {
    delete ret._id;

    return ret;
  }
});

measurementSchema.statics.deleteMeasurementsOfSensor = function deleteMeasurementsOfSensor (sensorId, createdAt) {
  const query = {
    sensor_id: sensorId
  };

  if (createdAt) {
    query.createdAt = createdAt;
  }

  // delete measurements
  return this.find(query)
    .remove()
    .exec()
    .then(function (removeResult) {
      const errors = [];
      // nothing removed -> lastMeasurement should not be updated
      if (removeResult && removeResult.result && removeResult.result.n === 0) {
        errors.push('NO_MATCHING_MEASUREMENTS');
        //throw new BadRequestError('no matching measurements for specified query');
      }
      // check for not ok deletion, this is not a failure but should generate a warning for the user
      if (removeResult.result.ok !== 1) {
        errors.push('DELETE_ERROR');
      }

      return errors;
    });
};

measurementSchema.statics.findLastMeasurementOfSensor = function findLastMeasurementOfSensor (sensorId) {
  return this.find({ sensor_id: sensorId })
    .sort({ createdAt: -1 })
    .limit(1)
    .exec();
};

measurementSchema.statics.decodeMeasurements = function decodeMeasurements (measurements, { contentType = 'json', sensors }) {
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

const measurementModel = mongoose.model('Measurement', measurementSchema);

module.exports = {
  schema: measurementSchema,
  model: measurementModel
};
