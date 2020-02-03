'use strict';

const { mongoose } = require('../db'),
  { model: Measurement } = require('../measurement/measurement'),
  ModelError = require('../modelError');

//Sensor schema
const sensorSchema = new mongoose.Schema({
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Measurement'
  }
}, { usePushEach: true });

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

sensorSchema.statics.findSensorsWithMeasurements = function findSensorsWithMeasurements ({ fromDate, toDate }) {
  return Measurement.aggregate([
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
        _id: '$sensor_id'
      },
    }
  ])
    .exec();
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
