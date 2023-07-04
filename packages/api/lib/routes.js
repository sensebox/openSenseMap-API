'use strict';

const { usersController,
    statisticsController,
    boxesController,
    sensorsController,
    measurementsController,
    managementController } = require('./controllers'),
  config = require('config'),
  { getVersion } = require('./helpers/apiUtils'),
  { verifyJwt } = require('./helpers/jwtHelpers'),
  { initUserParams, checkPrivilege } = require('./helpers/userParamHelpers');

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
const printRoutes = async function printRoutes (req, res) {
  res.header('Content-Type', 'text/plain; charset=utf-8');

  const lines = [
    `This is the openSenseMap API running on ${config.get('api_url')}`,
    `Version: ${getVersion}`,
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

const { boxes: boxesPath, users: usersPath, statistics: statisticsPath, management: managementPath } = config.get('routes');
// the ones matching first are used
// case is ignored
const routes = {
  'noauth': [
    { path: '/', method: 'get', handler: printRoutes, reference: 'api-Misc-printRoutes' },
    { path: '/stats', method: 'get', handler: statisticsController.getStatistics, reference: 'api-Misc-getStatistics' },
    { path: `${statisticsPath}/idw`, method: 'get', handler: statisticsController.getIdw, reference: 'api-Interpolation-calculateIdw' },
    { path: `${statisticsPath}/descriptive`, method: 'get', handler: statisticsController.descriptiveStatisticsHandler, reference: 'api-Statistics-descriptive' },
    { path: `${boxesPath}`, method: 'get', handler: boxesController.getBoxes, reference: 'api-Boxes-getBoxes' },
    { path: `${boxesPath}/data`, method: 'get', handler: measurementsController.getDataMulti, reference: 'api-Measurements-getDataMulti' },
    { path: `${boxesPath}/data/bytag`, method: 'get', handler: measurementsController.getDataByGroupTag, reference: 'api-Measurements-getDataByGroupTag' },
    { path: `${boxesPath}/:boxId`, method: 'get', handler: boxesController.getBox, reference: 'api-Boxes-getBox' },
    { path: `${boxesPath}/:boxId/sensors`, method: 'get', handler: measurementsController.getLatestMeasurements, reference: 'api-Measurements-getLatestMeasurements' },
    { path: `${boxesPath}/:boxId/sensors/:sensorId`, method: 'get', handler: measurementsController.getLatestMeasurements, reference: 'api-Measurements-getLatestMeasurementOfSensor' },
    { path: `${boxesPath}/:boxId/data/:sensorId`, method: 'get', handler: measurementsController.getData, reference: 'api-Measurements-getData' },
    { path: `${boxesPath}/:boxId/locations`, method: 'get', handler: boxesController.getBoxLocations, reference: 'api-Measurements-getLocations' },
    { path: `${boxesPath}/data`, method: 'post', handler: measurementsController.getDataMulti, reference: 'api-Measurements-getDataMulti' },
    { path: `${boxesPath}/:boxId/data`, method: 'post', handler: measurementsController.postNewMeasurements, reference: 'api-Measurements-postNewMeasurements' },
    { path: `${boxesPath}/:boxId/:sensorId`, method: 'post', handler: measurementsController.postNewMeasurement, reference: 'api-Measurements-postNewMeasurement' },
    { path: `${usersPath}/register`, method: 'post', handler: usersController.registerUser, reference: 'api-Users-register' },
    { path: `${usersPath}/request-password-reset`, method: 'post', handler: usersController.requestResetPassword, reference: 'api-Users-request-password-reset' },
    { path: `${usersPath}/password-reset`, method: 'post', handler: usersController.resetPassword, reference: 'api-Users-password-reset' },
    { path: `${usersPath}/confirm-email`, method: 'post', handler: usersController.confirmEmailAddress, reference: 'api-Users-confirm-email' },
    { path: `${usersPath}/sign-in`, method: 'post', handler: usersController.signIn, reference: 'api-Users-sign-in' },
    { path: `${usersPath}/refresh-auth`, method: 'post', handler: usersController.refreshJWT, reference: 'api-Users-refresh-auth' }
  ],
  'auth': [
    { path: `${usersPath}/me`, method: 'get', handler: usersController.getUser, reference: 'api-Users-getUser' },
    { path: `${usersPath}/me`, method: 'put', handler: usersController.updateUser, reference: 'api-Users-updateUser' },
    { path: `${usersPath}/me/boxes`, method: 'get', handler: usersController.getUserBoxes, reference: 'api-Users-getUserBoxes' },
    { path: `${usersPath}/me/boxes/:boxId`, method: 'get', handler: usersController.getUserBox, reference: 'api-Users-getUserBox' },
    { path: `${boxesPath}/:boxId/script`, method: 'get', handler: boxesController.getSketch, reference: 'api-Boxes-getSketch' },
    { path: `${boxesPath}`, method: 'post', handler: boxesController.postNewBox, reference: 'api-Boxes-postNewBox' },
    { path: `${boxesPath}/claim`, method: 'post', handler: boxesController.claimBox, reference: 'api-Boxes-claimBox' },
    { path: `${boxesPath}/transfer`, method: 'post', handler: boxesController.createTransfer, reference: 'api-Boxes-createTransfer' },
    { path: `${boxesPath}/transfer`, method: 'del', handler: boxesController.removeTransfer, reference: 'api-Boxes-removeTransfer' },
    { path: `${boxesPath}/transfer/:boxId`, method: 'get', handler: boxesController.getTransfer, reference: 'api-Boxes-getTransfer' },
    { path: `${boxesPath}/transfer/:boxId`, method: 'put', handler: boxesController.updateTransfer, reference: 'api-Boxes-updateTransfer' },
    { path: `${boxesPath}/:boxId`, method: 'put', handler: boxesController.updateBox, reference: 'api-Boxes-updateBox' },
    { path: `${boxesPath}/:boxId`, method: 'del', handler: boxesController.deleteBox, reference: 'api-Boxes-deleteBox' },
    { path: `${boxesPath}/:boxId/:sensorId/measurements`, method: 'del', handler: sensorsController.deleteSensorData, reference: 'api-Measurements-deleteMeasurements' },
    { path: `${usersPath}/sign-out`, method: 'post', handler: usersController.signOut, reference: 'api-Users-sign-out' },
    { path: `${usersPath}/me`, method: 'del', handler: usersController.deleteUser, reference: 'api-Users-deleteUser' },
    { path: `${usersPath}/me/resend-email-confirmation`, method: 'post', handler: usersController.requestEmailConfirmation, reference: 'api-Users-request-email-confirmation' }
  ],
  'management': [
    { path: `${managementPath}/boxes`, method: 'get', handler: managementController.listBoxes, reference: 'api-Admin-listBoxes' },
    { path: `${managementPath}/boxes/:boxId`, method: 'get', handler: managementController.getBox, reference: 'api-Admin-getBox' },
    { path: `${managementPath}/boxes/:boxId`, method: 'put', handler: managementController.updateBox, reference: 'api-Admin-updateBox' },
    { path: `${managementPath}/boxes/delete`, method: 'post', handler: managementController.deleteBoxes, reference: 'api-Admin-deleteBoxes' },
    { path: `${managementPath}/users`, method: 'get', handler: managementController.listUsers, reference: 'api-Admin-listUsers' },
    { path: `${managementPath}/users/:userId`, method: 'get', handler: managementController.getUser, reference: 'api-Admin-getUser' },
    { path: `${managementPath}/users/:userId`, method: 'put', handler: managementController.updateUser, reference: 'api-Admin-updateUser' },
    { path: `${managementPath}/users/delete`, method: 'post', handler: managementController.deleteUsers, reference: 'api-Admin-deleteUsers' },
    { path: `${managementPath}/users/:userId/exec`, method: 'post', handler: managementController.execUserAction, reference: 'api-Admin-execUserAction' },
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
  // The .use() method runs now for all routes
  // https://github.com/restify/node-restify/issues/1685
  for (const route of routes.auth) {
    server[route.method]({ path: route.path }, [verifyJwt, route.handler]);
  }

  // Attach verifyJwt and checkPrivilage routes (needs authorization through jwt)
  // The .use() method runs now for all routes
  // https://github.com/restify/node-restify/issues/1685
  for (const route of routes.management) {
    server[route.method]({ path: route.path }, [
      verifyJwt,
      checkPrivilege,
      route.handler,
    ]);
  }
};

module.exports = initRoutes;
