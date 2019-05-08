'use strict';

const
  { checkContentType } = require('../helpers/apiUtils'),
  {
    retrieveParameters,
    checkPrivilegeNotification
  } = require('../helpers/userParamHelpers'),
  handleError = require('../helpers/errorHandler'),
  {model: NotificationRule} = require('../../../models/src/notification/notificationRule'),
  {schema: NotificationChannelSchema} = require('../../../models/src/notification/notificationChannel'),

  jsonstringify = require('stringify-stream');


const listNotificationRules = async function listNotificationRules (req, res, next) {

    try {
        let personalRules  = await NotificationRule.find({user: req.user}).populate({
            path: 'notifications',
            options: {
                limit: 10,
                sort: { 'notificationTime': -1},
                skip: req.params.pageIndex*10
            }}).exec();
        res.send(201, { message: 'Rules retrieved', data: personalRules });
    } catch (err) {
        handleError(err, next);
    }
}


const createRule = async function createRule (req, res, next) {
    try {
        req._userParams = {
            ...req._userParams, 
            notificationChannel: [{ channel: 'email', email: req.user.email }]
        }
        var newRule = await NotificationRule.initNew(req.user, req._userParams);
        console.log(req.user.email);
        res.send(201, { message: 'Rule successfully created', data: newRule });
        // clearCache(['getBoxes', 'getStats']);
        // postToSlack(`New NotificationRule: ${req.user.name} (${redactEmail(req.user.email)}) just registered "${newBox.name}" (${newBox.model}): <https://opensensemap.org/explore/${newBox._id}|link>`);
    } catch (err) {
        handleError(err, next);
    }
}

const getRule = async function getRule (req, res, next) {
    try {
        let rule = await NotificationRule.findById(req._userParams.notificationRuleId).exec();
        res.send(201, { message: 'Rule successfully retrieved', data: rule } );

    } catch (err) {
        handleError(err, next);
    }


}

const updateRule = async function updateRule (req, res, next) {


    try {

        //CHECK THIS! NOT WORKING ATM
        let notificationRule = await NotificationRule.findByIdAndUpdate(req._userParams.notificationRuleId, req._userParams, {runValidators: true, new: true}).exec();
        // box = await notificationRule.update(req._userParams);
        res.send({code: 'Ok', data: notificationRule});

    } catch (err) {
        handleError(err, next);
    }
}

const deleteRule = async function deleteRule (req, res, next) {

    let deleted = await NotificationRule.remove({_id: req._userParams.notificationRuleId}).exec();
    console.log(deleted);
}



module.exports = {
    listNotificationRules: [
        listNotificationRules     
    ],
    createRule: [
        checkContentType,
        retrieveParameters([
            { predef: 'sensors', required: true },
            { name: 'box', required: true },
            { name: 'activationThreshold', required: true },
            { name: 'activationOperator', required: true },
            { name: 'activationTrigger', required: true },
            { name: 'notificationChannel', required: true, dataType: [NotificationChannelSchema] },
            { name: 'active', required: true },
        ]),
        checkPrivilegeNotification,
        createRule
    ],
    getRule: [
        retrieveParameters([
            { name: 'notificationRuleId', required: true },
            { name: 'box', required: true}
        ]),
        checkPrivilegeNotification,
        getRule
    ],
    updateRule: [
        checkContentType,
        retrieveParameters([
            { predef: 'sensors', required: true },
            { name: 'box', required: true },
            { name: 'notificationRuleId', required: true },
            { name: 'activationThreshold', required: true },
            { name: 'activationOperator', required: true },
            { name: 'activationTrigger', required: true },
            { name: 'notificationChannel', required: true , dataType: [NotificationChannelSchema]},
            { name: 'active', required: true },
        ]),
        checkPrivilegeNotification,
        updateRule
    ],
    deleteRule: [
        retrieveParameters([
            { name: 'notificationRuleId', required: true }
        ]),
        checkPrivilegeNotification,
        deleteRule
    ]

}