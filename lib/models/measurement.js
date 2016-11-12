'use strict';

const mongoose = require('mongoose'),
  timestamp = require('mongoose-timestamp'),
  Schema = mongoose.Schema;

const measurementSchema = new Schema({
  value: {
    type: String,
    required: true
  },
  sensor_id: {
    type: Schema.Types.ObjectId,
    ref: 'Sensor',
    required: true
  }
});
measurementSchema.plugin(timestamp);
measurementSchema.index({ sensor_id: 1, createdAt: -1 });

const measurementModel = mongoose.model('Measurement', measurementSchema);

module.exports = {
  schema: measurementSchema,
  model: measurementModel
};
