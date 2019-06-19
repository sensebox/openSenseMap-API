'use strict';

const { mongoose } = require('../db'),
  { schema: NotificationChannelSchema, model: NotificationChannel } = require('./notificationChannel'),
  { schema: NotificationSchema } = require('./notification'),
  { schema: sensorSchema, model: Sensor } = require('../sensor/sensor');


//Sensor schema
const notificationRuleSchema = new mongoose.Schema({
  sensors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sensor',
    required: true
  }],
  name: {
    type: String,
    required: true,
    maxLength: 40
  },
  box: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Box',
    required: true
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
    required: true,
    default: 'any'
  },
  notificationChannel: [NotificationChannelSchema],
  active: {
    type: Boolean,
    required: true,
    default: false,
    // validate: {
    //   validator: function(v, cb) {
    //     notificationRuleModel.find({active: true, user: v.user}, function(err,docs){
    //        cb(docs.length == 0);
    //     });
    //   },
    //   message: 'Only one active notification rule allowed!'
    // }
  },
  user: {
    ref: 'User',
    type: mongoose.Schema.Types.ObjectId
  }
});


notificationRuleSchema.statics.initNew = function(user, params){

  return this.create({
   ...params,
    user: user
  })
}


notificationRuleSchema.pre('validate', function(next) {
  if (this.active) {

      notificationRuleModel.find({active: this.active, user: this.user}, function(err,docs){
        if(docs.length < 1) {
          next();
        } else {
          next(new Error('Only one active notification rule allowed'));
        }
    });
    // next(new Error('Only one active notification rule allowed'));
  } else {
      next();
  }
});


const notificationRuleModel = mongoose.model('NotificationRule', notificationRuleSchema);

module.exports = {
  schema: notificationRuleSchema,
  model: notificationRuleModel
};




