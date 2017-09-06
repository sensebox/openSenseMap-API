'use strict';

const { mongoose } = require('../db');

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
