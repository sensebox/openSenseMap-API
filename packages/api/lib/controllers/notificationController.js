'use strict';

const
  { checkContentType } = require('../helpers/apiUtils'),
  {
    retrieveParameters,
  } = require('../helpers/userParamHelpers'),
  handleError = require('../helpers/errorHandler'),
  { model: NotificationRule } = require('../../../models/src/notification/notificationRule'),
  { model: Notification } = require('../../../models/src/notification/notification'),
  { schema: NotificationChannelSchema } = require('../../../models/src/notification/notificationChannel'),
  jsonstringify = require('stringify-stream');


const listNotificationRules = async function listNotificationRules(req, res, next) {

  try {
    let personalRules = await NotificationRule.find({ user: req.user }).exec();
    let populatedRules = [];
    for (let rule in personalRules) {
      rule = personalRules[rule];
      let notifications = await Notification.find({ notificationRule: rule._id }).sort({'notificationTime': -1}).limit(10).lean().exec();
      let popRule = { ...rule.toJSON(), notifications: notifications };
      populatedRules.push(popRule);
    };
    res.send(201, { message: 'Rules successfully retrieved', data: populatedRules });
  } catch (err) {
    handleError(err, next);
  }
}


const createRule = async function createRule(req, res, next) {
  try {
    // req._userParams = {
    //   ...req._userParams,
    //   notificationChannel: [{ channel: 'email', email: req.user.email }]
    // }
    var newRule = await NotificationRule.initNew(req.user, req._userParams);
    res.send(201, { message: 'Rule successfully created', data: newRule });
    // clearCache(['getBoxes', 'getStats']);
    // postToSlack(`New NotificationRule: ${req.user.name} (${redactEmail(req.user.email)}) just registered "${newBox.name}" (${newBox.model}): <https://opensensemap.org/explore/${newBox._id}|link>`);
  } catch (err) {
    handleError(err, next);
  }
}

const getRule = async function getRule(req, res, next) {
  try {
    let rule = await NotificationRule.findById(req._userParams.notificationRuleId).exec();
    res.send(201, { message: 'Rule successfully retrieved', data: rule });

  } catch (err) {
    handleError(err, next);
  }
  
  
}

const updateRule = async function updateRule(req, res, next) {
  

  try {
    
    //So complicated because mongoose validators with 2 properties dont work on updates on only one
    if(req._userParams.active === 'true') {
      let rule = await NotificationRule.findById(req._userParams.notificationRuleId).exec();
      let rules = await NotificationRule.find({user: rule.user, active: true }).exec();
      if(rules.length > 1 || (rules.length === 1 && rules[0]._id != req._userParams.notificationRuleId)) {
        res.send({ code: 'Error', data: "Only 1 active rule allowed" });
        return;
      } 
    }
      
    let notificationRule = await NotificationRule.findOneAndUpdate({ _id: req._userParams.notificationRuleId }, req._userParams, { runValidators: true, new: true, context: 'query', upsert: true, setDefaultsOnInsert: true }).exec();
    res.send({ code: 'Ok', data: notificationRule });

  } catch (err) {
    handleError(err, next);
  }
}

const deleteRule = async function deleteRule(req, res, next) {


  try {

    let deleted = await NotificationRule.remove({ _id: req._userParams.notificationRuleId }).exec();

    await Notification.remove({ notificationRule: req._userParams.notificationRuleId }).exec();

    res.send({code: 'Ok', msg: 'Rule deleted'})
  } catch (err) {
    handleError(err, next);
  }

}




module.exports = {
  listNotificationRules: [
    listNotificationRules
  ],
  createRule: [
    checkContentType,
    retrieveParameters([
      { predef: 'sensor', required: true },
      { name: 'box', required: true },
      { name: 'name', required: true },
      { name: 'activationThreshold', required: true },
      { name: 'activationOperator', required: true },
      { name: 'activationTrigger', required: true },
      { name: 'notificationChannel', required: true, dataType: [NotificationChannelSchema] },
      { name: 'active', required: true },
    ]),
    createRule
  ],
  getRule: [
    retrieveParameters([
      { name: 'notificationRuleId', required: true },
      { name: 'box', required: true }
    ]),
    getRule
  ],
  updateRule: [
    checkContentType,
    retrieveParameters([
      { predef: 'sensor', required: true },
      { name: 'box', required: true },
      { name: 'name', required: true },
      { name: 'notificationRuleId', required: true },
      { name: 'activationThreshold', required: true },
      { name: 'activationOperator', required: true },
      { name: 'activationTrigger', required: true },
      { name: 'notificationChannel', required: true, dataType: [NotificationChannelSchema] },
      { name: 'active', required: true },
    ]),
    updateRule
  ],
  deleteRule: [
    retrieveParameters([
      { name: 'notificationRuleId', required: true }
    ]),
    deleteRule
  ]

}
