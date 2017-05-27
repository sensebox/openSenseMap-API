'use strict';

const { mongoose } = require('../db'),
  Schema = mongoose.Schema,
  utils = require('../utils');

const measurementSchema = new Schema({
  value: {
    type: Number,
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
    default: utils.utcNowDate()
  }
});
measurementSchema.index({ sensor_id: 1, createdAt: -1 });
measurementSchema.index({ createdAt: -1 });

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
       //throw new restify.BadRequestError('no matching measurements for specified query');
     }
     // check for not ok deletion, this is not a failure but should generate a warning for the user
     if (removeResult.result.ok !== 1) {
       errors.push('DELETE_ERROR');
     }

     return errors;
   });
};

measurementSchema.statics.findLastMeasurmentOfSensor = function findLastMeasurmentOfSensor (sensorId) {
  return this.find({ sensor_id: sensorId })
    .sort({ createdAt: -1 })
    .limit(1)
    .exec();
};

measurementSchema.statics.findLastMeasurements = function findLastMeasurements ({ sensorIds, toDate = utils.utcNowDate() }) {
  const query = {
    createdAt: {
      '$lte': toDate
    }
  };

  if (!Array.isArray(sensorIds)) {
    sensorIds = [ sensorIds ];
  }

  const model = this;

  return Promise.all(
    sensorIds.map(function (sensor_id) {
      query.sensor_id = sensor_id;

      return model.find(query)
        .sort({ createdAt: -1 })
        .limit(1)
        .exec();
    }))
    .then(function (lastMeasurements) {
      return lastMeasurements.map(function (lastMeasurements) { return lastMeasurements[0]; });
    });

};

const measurementModel = mongoose.model('Measurement', measurementSchema);

module.exports = {
  schema: measurementSchema,
  model: measurementModel
};
