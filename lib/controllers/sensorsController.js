'use strict';

const { Box } = require('../models'),
  { checkContentType } = require('../helpers/apiUtils'),
  { retrieveParameters, validateFromToTimeParams, checkBoxIdOwner } = require('../helpers/userParamHelpers'),
  handleError = require('../helpers/errorHandler');

/**
 * @api {delete} /boxes/:senseBoxId/:sensorId/measurements Delete measurements of a sensor
 * @apiDescription This method allows to delete measurements for the specified sensor. Use the request body to specify which measurements should be deleted.
 * @apiName deleteMeasurements
 * @apiGroup Measurements
 * @apiUse JWTokenAuth
 * @apiUse ContentTypeJSON
 * @apiUse BoxIdParam
 * @apiUse SensorIdParam
 * @apiParam (RequestBody) {ISO8601Date} [from-date] Beginning date of measurement data (no default)
 * @apiParam (RequestBody) {ISO8601Date} [to-date] End date of measurement data (no default)
 * @apiParam (RequestBody) {ISO8601Date[]} [timestamps] Allows to specify timestamps which should be deleted
 * @apiParam (RequestBody) {Boolean=true,false} [deleteAllMeasurements=false] Specify `deleteAllMeasurements` with a value of `true` to delete all measurements of this sensor
 */
const deleteSensorData = function deleteSensorData (req, res, next) {
  Box.findBoxById(req._userParams.boxId, { lean: false })
    .then(function (box) {
      return box.deleteMeasurementsOfSensor(req._userParams);
    })
    .then(function (message) {
      res.send({ code: 'Ok', message });
    })
    .catch(function (err) {
      handleError(err, next);
    });
};

module.exports = {
  deleteSensorData: [
    checkContentType,
    retrieveParameters([
      { predef: 'boxId', required: true },
      { predef: 'sensorId', required: true },
      { name: 'deleteAllMeasurements' },
      { name: 'timestamps', dataType: ['ISO8601'] },
      { predef: 'toDateNoDefault' },
      { predef: 'fromDateNoDefault' }
    ]),
    validateFromToTimeParams,
    checkBoxIdOwner,
    deleteSensorData
  ]
};
