'use strict';

const { usersController, statisticsController, boxesController, sensorsController, measurementsController } = require('./controllers'),
  config = require('config'),
  { softwareRevision } = require('./helpers/apiUtils'),
  { checkJwt, checkUsernamePassword } = require('./helpers/authHelpers'),
  { initUserParams } = require('./helpers/userParamHelpers');

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
  res.header('Content-Type', 'text/plain; charset=utf-8');

  const lines = [
    `This is the openSenseMap API running on ${config.get('api_url')}`,
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

const { boxes: boxesPath, users: usersPath, statistics: statisticsPath } = config.get('routes');
// the ones matching first are used
// case is ignored
const routes = {
  'noauth': [
    { path: '/', method: 'get', handler: printRoutes, reference: 'api-Misc-printRoutes' },
    { path: '/stats', method: 'get', handler: statisticsController.getStatistics, reference: 'api-Misc-getStatistics' },
    { path: `${statisticsPath}/idw`, method: 'get', handler: statisticsController.getIdw, reference: 'api-Interpolation-calculateIdw' },
    { path: `${boxesPath}`, method: 'get', handler: boxesController.getBoxes, reference: 'api-Boxes-getBoxes' },
    { path: `${boxesPath}/data`, method: 'get', handler: measurementsController.getDataMulti, reference: 'api-Measurements-getDataMulti' },
    { path: `${boxesPath}/:boxId`, method: 'get', handler: boxesController.getBox, reference: 'api-Boxes-getBox' },
    { path: `${boxesPath}/:boxId/sensors`, method: 'get', handler: measurementsController.getLatestMeasurements, reference: 'api-Measurements-getLatestMeasurements' },
    { path: `${boxesPath}/:boxId/data/:sensorId`, method: 'get', handler: measurementsController.getData, reference: 'api-Measurements-getData' },
    { path: `${boxesPath}/:boxId/locations`, method: 'get', handler: boxesController.getBoxLocations, reference: 'api-Measurements-getLocations' },
    { path: `${boxesPath}/data`, method: 'post', handler: measurementsController.getDataMulti, reference: 'api-Measurements-getDataMulti' },
    { path: `${boxesPath}/:boxId/data`, method: 'post', handler: measurementsController.postNewMeasurements, reference: 'api-Measurements-postNewMeasurements' },
    { path: `${boxesPath}/:boxId/:sensorId`, method: 'post', handler: measurementsController.postNewMeasurement, reference: 'api-Measurements-postNewMeasurement' },
    { path: `${usersPath}/register`, method: 'post', handler: usersController.registerUser, reference: 'api-Users-register' },
    { path: `${usersPath}/request-password-reset`, method: 'post', handler: usersController.requestResetPassword, reference: 'api-Users-request-password-reset' },
    { path: `${usersPath}/password-reset`, method: 'post', handler: usersController.resetPassword, reference: 'api-Users-password-reset' },
    { path: `${usersPath}/confirm-email`, method: 'post', handler: usersController.confirmEmailAddress, reference: 'api-Users-confirm-email' },
    { path: `${usersPath}/sign-in`, method: 'post', handler: [checkUsernamePassword, usersController.signIn], reference: 'api-Users-sign-in' },
    { path: `${usersPath}/refresh-auth`, method: 'post', handler: usersController.refreshJWT, reference: 'api-Users-refresh-auth' }
  ],
  'auth': [
    { path: `${usersPath}/me`, method: 'get', handler: usersController.getUser, reference: 'api-Users-getUser' },
    { path: `${usersPath}/me`, method: 'put', handler: usersController.updateUser, reference: 'api-Users-updateUser' },
    { path: `${usersPath}/me/boxes`, method: 'get', handler: usersController.getUserBoxes, reference: 'api-Users-getUserBoxes' },
    { path: `${boxesPath}/:boxId/script`, method: 'get', handler: boxesController.getSketch, reference: 'api-Boxes-getSketch' },
    { path: `${boxesPath}`, method: 'post', handler: boxesController.postNewBox, reference: 'api-Boxes-postNewBox' },
    { path: `${boxesPath}/:boxId`, method: 'put', handler: boxesController.updateBox, reference: 'api-Boxes-updateBox' },
    { path: `${boxesPath}/:boxId`, method: 'del', handler: boxesController.deleteBox, reference: 'api-Boxes-deleteBox' },
    { path: `${boxesPath}/:boxId/:sensorId/measurements`, method: 'del', handler: sensorsController.deleteSensorData, reference: 'api-Measurements-deleteMeasurements' },
    { path: `${usersPath}/sign-out`, method: 'post', handler: usersController.signOut, reference: 'api-Users-sign-out' },
    { path: `${usersPath}/me`, method: 'del', handler: usersController.deleteUser, reference: 'api-Users-deleteUser' },
    { path: `${usersPath}/me/resend-email-confirmation`, method: 'post', handler: usersController.requestEmailConfirmation, reference: 'api-Users-request-email-confirmation' }
  ]
};

const initRoutes = function initRoutes (server) {
  // attach a function for user parameters
  server.use(initUserParams);

  // attach the routes
  for (const route of routes.noauth) {
    server[route.method]({ path: route.path }, route.handler);
  }

  // Attach secured routes (needs authorization through jwt)
  server.use(checkJwt);

  for (const route of routes.auth) {
    server[route.method]({ path: route.path }, route.handler);
  }
};

module.exports = initRoutes;
