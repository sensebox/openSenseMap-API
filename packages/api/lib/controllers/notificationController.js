'use strict';

const
  { checkContentType } = require('../helpers/apiUtils'),
  {
    retrieveParameters,
    checkPrivilegeNotification
  } = require('../helpers/userParamHelpers'),
  handleError = require('../helpers/errorHandler'),
  jsonstringify = require('stringify-stream');


const listNotifications = function listNotifications (req, res, next) {
}


const createRule = function createRule (req, res, next) {
}

const getRule = function getRule (req, res, next) {
}

const updateRule = function updateRule (req, res, next) {
}

const deleteRule = function deleteRule (req, res, next) {
}



module.exports = {
    listNotifications: [
        listNotifications     
    ],
    createRule: [
        checkContentType,
        retrieveParameters([
            { name: 'sensorIds', required: true },
            { name: 'activationThreshold', required: true },
            { name: 'activatitonOperator', required: true },
            { name: 'activationTrigger', required: true },
            { name: 'notificationChannel', required: true },
            { name: 'active', required: true },
        ]),
        checkPrivilegeNotification,
        createRule
    ],
    getRule: [
        retrieveParameters([
            { preDef: 'notificationRuleId', required: true },
        ]),
        checkPrivilegeNotification,
        getRule
    ],
    updateRule: [
        checkContentType,
        retrieveParameters([
            { preDef: 'notificationRuleId', required: true },
            { name: 'sensorIds', required: true },
            { name: 'activationThreshold', required: true },
            { name: 'activatitonOperator', required: true },
            { name: 'activationTrigger', required: true },
            { name: 'notificationChannel', required: true },
            { name: 'active', required: true },
        ]),
        checkPrivilegeNotification,
        updateRule
    ],
    deleteRule: [
        retrieveParameters([
            { preDef: 'notificationRuleId', required: true }
        ]),
        checkPrivilegeNotification,
        deleteRule
    ]

}