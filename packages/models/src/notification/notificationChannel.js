'use strict';

const { mongoose } = require('../db');


//Sensor schema
const notificationChannelSchema = new mongoose.Schema({
  channel: {
    type: String,
    enum: ['web', 'email', 'apple', 'google', 'sms', 'mqtt'],
    required: true
  },
  email: {
      type: String
  },
  socket: {
      type: String
  },
  phoneNumber: {
      type: String
  },
  appleId: {
      type: String
  },
  googleId: {
      type: String
  }
});



const notificationChannelModel = mongoose.model('NotificationChannel', notificationChannelSchema);

module.exports = {
  schema: notificationChannelSchema,
  model: notificationChannelModel
};
