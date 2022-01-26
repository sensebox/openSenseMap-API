'use strict';

const
  { checkContentType } = require('../helpers/apiUtils'),
  {
    retrieveParameters,
  } = require('../helpers/userParamHelpers'),
  handleError = require('../helpers/errorHandler'),
  { model: NotificationRule } = require('../../../models/src/notification/notificationRule'),
  { model: NotificationRuleConnector } = require('../../../models/src/notification/notificationRuleConnector'),
  { model: Notification } = require('../../../models/src/notification/notification'),
  { schema: NotificationChannelSchema } = require('../../../models/src/notification/notificationChannel'),
  jsonstringify = require('stringify-stream'),
  { UnauthorizedError, NotFoundError } = require('restify-errors');

const connectRules = async function connectRules(req, res, next) {

  try {
    let ruleA = await NotificationRule.find({ _id: req._userParams.ruleA }).exec();
    let ruleB = await NotificationRule.find({ _id: req._userParams.ruleB }).exec();
    if (ruleA.length == 1 && ruleB.length == 1) {
      if (ruleA[0].user == req.user.id && ruleB[0].user == req.user.id) {
        var newConnector= await NotificationRuleConnector.initNew(req.user, req._userParams);
        res.send(201, { message: 'Rules successfully connected', data: newConnector });
      }
      else {
        res.send(new NotFoundError(`You can onnly connect rules that belong to your user`));
      }
    }
    else {
      res.send(new NotFoundError(`Rules were not found`));
    }
  } catch (err) {
    handleError(err, next);
  }
}

const deleteConnector = async function deleteConnector(req, res, next) {

  try {
    await NotificationRuleConnector.remove({ _id: req._userParams.notificationRuleConnectorId }).exec();

    res.send({code: 'Ok', msg: 'Connector deleted'})
  } catch (err) {
    handleError(err, next);
  }
}

const updateConnector = async function updateConnector(req, res, next) {
  
  try {
      
    let notificationRuleConnector = await NotificationRuleConnector.findOneAndUpdate({ _id: req._userParams.notificationRuleConnectorId }, req._userParams, { runValidators: true, new: true, context: 'query', upsert: true, setDefaultsOnInsert: true }).exec();
    res.send({ code: 'Ok', data: notificationRuleConnector });

  } catch (err) {
    handleError(err, next);
  }
}

const listNotificationRuleConnectors = async function listNotificationRuleConnectors(req, res, next) {

  try {
    let personalRuleConnectors = await NotificationRuleConnector.find({ user: req.user }).exec();
    res.send(201, { message: 'Connectors successfully retrieved', data: personalRuleConnectors });
  } catch (err) {
    handleError(err, next);
  }
}

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
      
    let notificationRule = await NotificationRule.findOneAndUpdate({ _id: req._userParams.notificationRuleId }, req._userParams, { runValidators: true, new: true, context: 'query', upsert: true, setDefaultsOnInsert: true }).exec();
    res.send({ code: 'Ok', data: notificationRule });

  } catch (err) {
    handleError(err, next);
  }
}

const deleteRule = async function deleteRule(req, res, next) {

  try {

    let deletedNotificationRules = await NotificationRule.remove({ _id: req._userParams.notificationRuleId }).exec();
    let deletedConnectors = await NotificationRuleConnector.remove({ $or: [ { ruleA: req._userParams.notificationRuleId },  
      { ruleB: req._userParams.notificationRuleId }]}).exec();

    let deletedNotifications = await Notification.remove({ notificationRule: req._userParams.notificationRuleId }).exec();

    res.send({code: 'Ok', msg: 'Rule deleted with ' + deletedNotifications.result.n + ' notifications and ' + deletedConnectors.result.n + ' notification rule connectors'})
  } catch (err) {
    handleError(err, next);
  }

}

const getNotifications = async function getNotifications(req, res, next) {

  try {
    // TODO: test if notificationRule belongs to user
    let personalRules = await Notification.find().exec();

    res.send(201, { message: 'Notifications successfully retrieved', data: personalRules });
  } catch (err) {
    handleError(err, next);
  }
}



module.exports = {
  connectRules: [
    checkContentType,
    retrieveParameters([
      { name: 'name', required: true },
      { name: 'ruleA', required: true },
      { name: 'ruleB', required: true },
      { name: 'connectionOperator', required: true },
      { name: 'active', required: true },
      { name: 'connected', required: false }
    ]),
    connectRules
  ],
  deleteConnector: [
    retrieveParameters([
      { name: 'notificationRuleConnectorId', required: true }
    ]),
    deleteConnector
  ],
  updateConnector: [
    checkContentType,
    retrieveParameters([
      { name: 'notificationRuleConnectorId', required: true },
      { name: 'name', required: true },
      { name: 'ruleA', required: true },
      { name: 'ruleB', required: true },
      { name: 'connectionOperator', required: true },
      { name: 'active', required: true },
      { name: 'connected', required: false }
    ]),
    updateConnector
  ],
  getConnectors: [
    listNotificationRuleConnectors
  ],
  listNotificationRules: [
    listNotificationRules
  ],
  createRule: [
    checkContentType,
    retrieveParameters([
      { predef: 'sensors', required: true },
      { name: 'box', required: true },
      { name: 'name', required: true },
      { name: 'activationThreshold', required: true },
      { name: 'activationOperator', required: true },
      { name: 'activationTrigger', required: true },
      { name: 'notificationChannel', required: true, dataType: [NotificationChannelSchema] },
      { name: 'active', required: true },
      { name: 'connected', required: false }
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
      { predef: 'sensors', required: true },
      { name: 'box', required: true },
      { name: 'name', required: true },
      { name: 'notificationRuleId', required: true },
      { name: 'activationThreshold', required: true },
      { name: 'activationOperator', required: true },
      { name: 'activationTrigger', required: true },
      { name: 'notificationChannel', required: true, dataType: [NotificationChannelSchema] },
      { name: 'active', required: true },
      { name: 'connected', required: false }
    ]),
    updateRule
  ],
  deleteRule: [
    retrieveParameters([
      { name: 'notificationRuleId', required: true }
    ]),
    deleteRule
  ],
  getNotifications: [
    retrieveParameters([
      { name: 'notificationRuleId', required: true }
    ]),
    getNotifications
  ]

}
