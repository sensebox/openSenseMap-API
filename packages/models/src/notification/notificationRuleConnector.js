'use strict';

const { mongoose } = require('../db'),
  { schema: NotificationChannelSchema, model: NotificationChannel } = require('./notificationChannel'),
  { schema: NotificationSchema } = require('./notification'),
  { schema: NotificationRuleSchema } = require('./notificationRule'),
  { schema: sensorSchema, model: Sensor } = require('../sensor/sensor');


//Sensor schema
const notificationRuleConnectorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxLength: 40
  },
  ruleA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'notificationRule',
    required: true
  },
  ruleB: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'notificationRule',
    required: true
  },
  connectionOperator: {
    type: String,
    enum: ['and', 'or', 'xor'],
    required: true
  },
  active: {
    type: Boolean,
    required: true,
    default: false
  },
  user: {
    ref: 'User',
    type: mongoose.Schema.Types.ObjectId
  },
  connected: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'notificationRuleConnector',
    required: false
  }
});


notificationRuleConnectorSchema.statics.initNew = function(user, params){

  return this.create({
   ...params,
    user: user
  })
}


notificationRuleConnectorSchema.pre('validate', function(next) {
  if (this.active) {

    notificationRuleConnectorModel.find({ruleA: this.ruleA, ruleB: this.ruleB, connectionOperator: this.connectionOperator}, function(err,docs){
        if(docs.length < 1) {
          next();
        } else {
          next(new Error('Rules are already connected'));
        }
    });
  } else {
      next();
  }
});


const notificationRuleConnectorModel = mongoose.model('NotificationRuleConnector', notificationRuleConnectorSchema);

module.exports = {
  schema: notificationRuleConnectorSchema,
  model: notificationRuleConnectorModel
};