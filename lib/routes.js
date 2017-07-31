'use strict';

const { initUserParams, validateIdParams } = require('./requestUtils'),
  { usersController, statisticsController, boxesController, sensorsController } = require('./controllers'),
  { config: { statisticsPath, basePath, userPath, api_url }, softwareRevision } = require('./utils'),
  authHelpers = require('./helpers').authHelpers;

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
    `This is the openSenseMap API running on ${api_url}`,
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
    { path: `${statisticsPath}/idw`, method: 'get', handler: statisticsController.getIdw, reference: 'api-Interpolation-calculateIdw' },
    { path: `${basePath}`, method: 'get', handler: boxesController.findAllBoxes, reference: 'api-Boxes-findAllBoxes' },
    { path: `${basePath}/data`, method: 'get', handler: boxesController.getDataMulti, reference: 'api-Measurements-getDataMulti' },
    { path: `${basePath}/:boxId`, method: 'get', handler: boxesController.findBox, reference: 'api-Boxes-findBox' },
    { path: `${basePath}/:boxId/sensors`, method: 'get', handler: boxesController.getMeasurements, reference: 'api-Measurements-getMeasurements' },
    { path: `${basePath}/:boxId/data/:sensorId`, method: 'get', handler: boxesController.getData, reference: 'api-Measurements-getData' },
    { path: `${basePath}/:boxId/locations`, method: 'get', handler: boxesController.getBoxLocations, reference: 'api-Measurements-getLocations' },
    { path: `${basePath}/:boxId/area`, method: 'get', handler: boxesController.getBoxArea, reference: 'api-Measurements-getArea' },
    { path: `${basePath}/data`, method: 'post', handler: boxesController.getDataMulti, reference: 'api-Measurements-getDataMulti' },
    { path: `${basePath}/:boxId/data`, method: 'post', handler: boxesController.postNewMeasurements, reference: 'api-Measurements-postNewMeasurements' },
    { path: `${basePath}/:boxId/:sensorId`, method: 'post', handler: boxesController.postNewMeasurement, reference: 'api-Measurements-postNewMeasurement' },
    { path: `${userPath}/register`, method: 'post', handler: usersController.registerUser, reference: 'api-Users-register' },
    { path: `${userPath}/request-password-reset`, method: 'post', handler: usersController.requestResetPassword, reference: 'api-Users-request-password-reset' },
    { path: `${userPath}/password-reset`, method: 'post', handler: usersController.resetPassword, reference: 'api-Users-password-reset' },
    { path: `${userPath}/confirm-email`, method: 'post', handler: usersController.confirmEmailAddress, reference: 'api-Users-confirm-email' },
    { path: `${userPath}/sign-in`, method: 'post', handler: [ authHelpers.checkUsernamePassword, usersController.signIn ], reference: 'api-Users-sign-in' },
    { path: `${userPath}/refresh-auth`, method: 'post', handler: usersController.refreshJWT, reference: 'api-Users-refresh-auth' }
  ],
  'auth': [
    { path: `${userPath}/me`, method: 'get', handler: usersController.getUser, reference: 'api-Users-getUser' },
    { path: `${userPath}/me`, method: 'put', handler: usersController.updateUser, reference: 'api-Users-updateUser' },
    { path: `${userPath}/me/boxes`, method: 'get', handler: usersController.getUserBoxes, reference: 'api-Users-getUserBoxes' },
    { path: `${basePath}/:boxId/script`, method: 'get', handler: boxesController.getScript, reference: 'api-Boxes-getScript' },
    { path: `${basePath}`, method: 'post', handler: boxesController.postNewBox, reference: 'api-Boxes-postNewBox' },
    { path: `${basePath}/:boxId`, method: 'put', handler: boxesController.updateBox, reference: 'api-Boxes-updateBox' },
    { path: `${basePath}/:boxId`, method: 'del', handler: boxesController.deleteBox, reference: 'api-Boxes-deleteBox' },
    { path: `${basePath}/:boxId/:sensorId/measurements`, method: 'del', handler: sensorsController.deleteSensorData, reference: 'api-Measurements-deleteMeasurements' },
    { path: `${userPath}/sign-out`, method: 'post', handler: usersController.signOut, reference: 'api-Users-sign-out' },
    { path: `${userPath}/me`, method: 'del', handler: usersController.deleteUser, reference: 'api-Users-deleteUser' },
    { path: `${userPath}/me/resend-email-confirmation`, method: 'post', handler: usersController.requestEmailConfirmation, reference: 'api-Users-request-email-confirmation' }
  ]
};

const initRoutes = function initRoutes (server) {

  // attach a function for user parameters
  server.use(initUserParams);

  // attach a function to validate boxId and sensorId parameters
  // check parmeters for possible box Id parameters
  // everything of the like
  // 'boxId', 'boxid', 'senseBoxIds', 'senseBoxId'
  // can be used
  server.use(validateIdParams);

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
