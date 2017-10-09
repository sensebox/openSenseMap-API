'use strict';

/**
 * define for a senseBox Sensor
 * @apiDefine Sensor A single sensor for the nested Sensor parameter
 */

/**
 * @apiDefine SensorBody
 *
 * @apiParam (Sensor) {String} title the title of the phenomenon the sensor observes.
 * @apiParam (Sensor) {String} unit the unit of the phenomenon the sensor observes.
 * @apiParam (Sensor) {String} sensorType the type of the sensor.
 * @apiParam (Sensor) {String} [icon] the visual representation for the openSenseMap of this sensor.
 *
 */

/**
 * @apiDefine SensorIdParam
 *
 * @apiParam {String} sensorId the ID of the sensor you are referring to.
 */

const { mongoose } = require('../db'),
  { model: Measurement } = require('./measurement'),
  ModelError = require('./modelError'),
  Schema = mongoose.Schema;

//Sensor schema
const sensorSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  sensorType: {
    type: String,
    required: false,
    trim: true
  },
  icon: {
    type: String,
    required: false,
    trim: true
  },
  lastMeasurement: {
    type: Schema.Types.ObjectId,
    ref: 'Measurement'
  }
});

sensorSchema.methods.equals = function equals ({ unit, sensorType, title, _id }) {
  if (_id) {
    return this._id.equals(_id);
  }

  return unit === this.unit && sensorType === this.sensorType && title === this.title;
};

sensorSchema.methods.markForDeletion = function markForDeletion () {
  this.markModified('deleteMe'); // markModified to be picked up by box pre save hook modifiedPaths
  this._deleteMe = true; // gets checked
};

sensorSchema.methods.findLastMeasurement = function findLastMeasurement () {
  return Measurement.find({ sensor_id: this._id })
    .sort({ createdAt: -1 })
    .limit(1)
    .exec()
    .then(function (lastMeasurement) {
      if (lastMeasurement && Array.isArray(lastMeasurement) && lastMeasurement.length !== 0) {
        return lastMeasurement[0];
      }
    });
};

sensorSchema.methods.deleteMeasurements = function deleteMeasurements (createdAt) {
  const sensor = this;

  const query = {
    sensor_id: sensor._id,
  };

  if (createdAt) {
    query.createdAt = createdAt;
  }

  // delete measurements
  return Measurement.find(query)
    .remove()
    .exec()
    .then(function (removeResult) {
      if (removeResult && removeResult.result && removeResult.result.n === 0) {
        throw new ModelError('No matching measurements for specified query', { type: 'NotFoundError' });
      }

      // check if not all measurements were deleted
      // need to find the new last measurement
      if (typeof query.createdAt !== 'undefined') {
        return sensor.findLastMeasurement();
      }

      return Promise.resolve();
    })
    .then(function (newLastMeasurement) {
      sensor.set('lastMeasurement', newLastMeasurement);
    });

};

const sensorModel = mongoose.model('Sensor', sensorSchema);

module.exports = {
  schema: sensorSchema,
  model: sensorModel
};
