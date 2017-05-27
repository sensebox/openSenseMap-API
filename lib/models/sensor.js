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

const { mongoose } = require('../db');

const lastMeasurementSchema = new mongoose.Schema({
  value: {
    type: Number,
  },
  createdAt: {
    type: Date,
  }
}, { _id: false });

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
  lastMeasurement: lastMeasurementSchema
});

const sensorModel = mongoose.model('Sensor', sensorSchema);

module.exports = {
  schema: sensorSchema,
  model: sensorModel
};
