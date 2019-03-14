'use strict';

const { mongoose } = require('../db');


//Sensor schema
const notificationSchema = new mongoose.Schema({
  notificationRule: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NotificationRule',
    required: true 
  },
  notificationTime: {
    type: Date,
    required: true
  },
  notificationValue: {
      type: Number
  }
});



const notificationModel = mongoose.model('Notification', notificationSchema);

module.exports = {
  schema: notificationSchema,
  model: notificationModel
};
