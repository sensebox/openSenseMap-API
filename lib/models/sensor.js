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
 * @apiParam {String} :sensorId the ID of the sensor you are referring to.
 */

const mongoose = require('mongoose'),
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

const sensorModel = mongoose.model('Sensor', sensorSchema);

module.exports = {
  schema: sensorSchema,
  model: sensorModel
};
