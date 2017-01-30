'use strict';

const requestUtils = require('./requestUtils'),
  controllers = require('./controllers'),
  utils = require('./utils'),
  authHelpers = require('./helpers').authHelpers;

const { usersController, statisticsController, boxesController, sensorsController } = controllers;
const { config, softwareRevision } = utils;

const spaces = function spaces (num) {
  let str = ' ';
  for (let i = 1; i < num; i++) {
    str = `${str} `;
  }

  return str;
};

/**
 * @api {get} / print all routes
 * @apiName printRoutes
 * @apiDescription Returns all routes of this API in human readable format
 * @apiGroup Misc
 */
const printRoutes = function printRoutes (req, res) {
  res.header('Content-Type', 'text/plain');

  const lines = [
    `This is the openSenseMap API running on ${config.origin}`,
    `Revision: ${softwareRevision}`,
    'You can find a detailed reference at https://docs.opensensemap.org',
    '',
    'Routes requiring no authentication:'
  ];

  const longestRoute = 37;

  for (const route of routes.noauth) {
    let method = route.method.toLocaleUpperCase();
    if (method === 'DEL') {
      method = 'DELETE';
    } else {
      method = `${method}${spaces(6 - method.length)}`;
    }

    lines.push(`${method} ${route.path}${spaces(longestRoute - route.path.length)} Reference: https://docs.opensensemap.org/#${route.reference}`);
  }

  lines.push('');
  lines.push('Routes requiring valid authentication through JWT:');

  for (const route of routes.auth) {
    let method = route.method.toLocaleUpperCase();
    if (method === 'DEL') {
      method = 'DELETE';
    } else {
      method = `${method}${spaces(6 - method.length)}`;
    }

    lines.push(`${method} ${route.path}${spaces(longestRoute - route.path.length)} Reference: https://docs.opensensemap.org/#${route.reference}`);
  }

  res.end(lines.join('\n'));
};

// the ones matching first are used
// case is ignored
const routes = {
  'noauth': [
    { path: '/', method: 'get', handler: printRoutes, reference: 'api-Misc-printRoutes' },
    { path: '/stats', method: 'get', handler: statisticsController.getStatistics, reference: 'api-Misc-getStatistics' },
    { path: `${config.statisticsPath}/idw`, method: 'get', handler: statisticsController.getIdw, reference: 'api-Interpolation-calculateIdw' },
    { path: `${config.basePath}`, method: 'get', handler: boxesController.findAllBoxes, reference: 'api-Boxes-findAllBoxes' },
    { path: `${config.basePath}/data`, method: 'get', handler: boxesController.getDataMulti, reference: 'api-Measurements-getDataMulti' },
    { path: `${config.basePath}/:boxId`, method: 'get', handler: boxesController.findBox, reference: 'api-Boxes-findBox' },
    { path: `${config.basePath}/:boxId/sensors`, method: 'get', handler: boxesController.getMeasurements, reference: 'api-Measurements-getMeasurements' },
    { path: `${config.basePath}/:boxId/data/:sensorId`, method: 'get', handler: boxesController.getData, reference: 'api-Measurements-getData' },
    { path: `${config.basePath}/data`, method: 'post', handler: boxesController.getDataMulti, reference: 'api-Measurements-getDataMulti' },
    { path: `${config.basePath}/:boxId/data`, method: 'post', handler: boxesController.postNewMeasurements, reference: 'api-Measurements-postNewMeasurements' },
    { path: `${config.basePath}/:boxId/:sensorId`, method: 'post', handler: boxesController.postNewMeasurement, reference: 'api-Measurements-postNewMeasurement' },
    { path: `${config.userPath}/register`, method: 'post', handler: usersController.registerUser, reference: 'api-Users-register' },
    { path: `${config.userPath}/request-password-reset`, method: 'post', handler: usersController.requestResetPassword, reference: 'api-Users-request-password-reset' },
    { path: `${config.userPath}/password-reset`, method: 'post', handler: usersController.resetPassword, reference: 'api-Users-password-reset' },
    { path: `${config.userPath}/confirm-email`, method: 'post', handler: usersController.confirmEmailAddress, reference: 'api-Users-confirm-email' },
    { path: `${config.userPath}/sign-in`, method: 'post', handler: [ authHelpers.checkUsernamePassword, usersController.signIn ], reference: 'api-Users-sign-in' }
  ],
  'auth': [
    { path: `${config.userPath}/me/boxes`, method: 'get', handler: usersController.getUserBoxes, reference: 'api-Users-getUserBoxes' },
    { path: `${config.basePath}/:boxId/script`, method: 'get', handler: boxesController.getScript, reference: 'api-Boxes-getScript' },
    { path: `${config.basePath}`, method: 'post', handler: boxesController.postNewBox, reference: 'api-Boxes-postNewBox' },
    { path: `${config.basePath}/:boxId`, method: 'put', handler: boxesController.updateBox, reference: 'api-Boxes-updateBox' },
    { path: `${config.basePath}/:boxId`, method: 'del', handler: boxesController.deleteBox, reference: 'api-Boxes-deleteBox' },
    { path: `${config.basePath}/:boxId/:sensorId/measurements`, method: 'del', handler: sensorsController.deleteSensorData, reference: 'api-Measurements-deleteMeasurements' },
    { path: `${config.userPath}/sign-out`, method: 'post', handler: usersController.signOut, reference: 'api-Users-sign-out' }
  ]
};

const initRoutes = function initRoutes (server) {

  // attach a function for user parameters
  server.use(requestUtils.initUserParams);

  // attach a function to validate boxId and sensorId parameters
  // check parmeters for possible box Id parameters
  // everything of the like
  // 'boxId', 'boxid', 'senseBoxIds', 'senseBoxId'
  // can be used
  server.use(requestUtils.validateIdParams);

  // attach the routes
  for (const route of routes.noauth) {
    server[route.method]({ path: route.path }, route.handler);
  }

  // Attach secured routes (needs authorization through jwt)
  server.use(authHelpers.checkJwt);

  for (const route of routes.auth) {
    server[route.method]({ path: route.path }, route.handler);
  }
};

module.exports = initRoutes;
