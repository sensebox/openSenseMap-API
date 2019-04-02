'use strict';

const { mongoose } = require('../db'),
  { schema: sensorSchema, model: Sensor } = require('../sensor/sensor');


//Sensor schema
const notificationRuleSchema = new mongoose.Schema({
  sensors: {
    type: [sensorSchema],
    required: [true, 'at least one sensor required.'],
  },
  activationThreshold: {
    type: Number,
    required: true
  },
  activationOperator: {
    type: String,
    enum: ['over', 'under', 'equal'],
    required: true
  },
  activationTrigger: {
    type: String,
    enum: ['any', 'all'],
    required: true
  },
  notificationChannel: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NotificationChannel',
    required: true
  }],
  active: {
    type: Boolean,
    required: true,
    default: true
  },
  user: {
    ref: 'User',
    type: mongoose.Schema.Types.ObjectId
  }
});


const notificationRuleModel = mongoose.model('NotificationRule', notificationRuleSchema);

module.exports = {
  schema: notificationRuleSchema,
  model: notificationRuleModel
};
