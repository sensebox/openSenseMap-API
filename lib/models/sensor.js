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

const sensorModel = mongoose.model('Sensor', sensorSchema);

module.exports = {
  schema: sensorSchema,
  model: sensorModel
};
