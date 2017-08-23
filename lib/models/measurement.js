'use strict';

const { mongoose } = require('../db'),
  Schema = mongoose.Schema,
  moment = require('moment'),
  decodeHandlers = require('../decoding'),
  ModelError = require('./modelError'),
  csvstringify = require('csv-stringify'),
  streamTransform = require('stream-transform'),
  jsonstringify = require('stringify-stream'),
  { outlierTransformer } = require('../statistics');

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

const csvColumns = ['createdAt', 'value'];

const jsonLocationReplacer = function jsonLocationReplacer (k, v) {
  // dont send unnecessary nested location
  return (k === 'location') ? v.coordinates : v;
};

const getDataTransformerFunction = function getDataTransformerFunction (data) {
  data.createdAt = data.createdAt.toISOString();

  return data;
};

measurementSchema.statics.getMeasurementsStream = function getMeasurementsStream ({ format, delimiter, fromDate, toDate, sensorId, outliers, outlierWindow }) {
  let stringifier;
  // IDEA: add geojson point featurecollection format
  if (format === 'csv') {
    stringifier = csvstringify({ columns: csvColumns, header: 1, delimiter });
  } else if (format === 'json') {
    stringifier = jsonstringify({ open: '[', close: ']' }, jsonLocationReplacer);
  }

  // finally execute the query
  const queryLimit = 10000;

  const qry = {
    sensor_id: sensorId,
    createdAt: {
      $gte: fromDate.toDate(),
      $lte: toDate.toDate()
    }
  };

  let measurementsCursor = this
    .find(qry, { 'createdAt': 1, 'value': 1, 'location': 1, '_id': 0 })
    .cursor({ lean: true, limit: queryLimit })
    .pipe(streamTransform(getDataTransformerFunction));

  if (outliers) {
    measurementsCursor = measurementsCursor
      .pipe(outlierTransformer({
        window: Math.trunc(outlierWindow), // only allow integer values
        replaceOutlier: (outliers === 'replace')
      }))
      .pipe(stringifier);
  }

  return measurementsCursor
    .pipe(stringifier);
};

const measurementModel = mongoose.model('Measurement', measurementSchema);

module.exports = {
  schema: measurementSchema,
  model: measurementModel
};
