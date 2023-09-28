'use strict';

const { Box } = require('@sensebox/opensensemap-api-models'),
  { checkContentType } = require('../helpers/apiUtils'),
  { retrieveParameters, validateFromToTimeParams, checkPrivilege } = require('../helpers/userParamHelpers'),
  handleError = require('../helpers/errorHandler');

/**
 * define for a senseBox Sensor
 * @apiDefine Sensor A single sensor for the nested Sensor parameter
 */

/**
 * @apiDefine SensorBody
 *
 * @apiParam (Sensor) {String} title the title of the phenomenon the sensor observes.
 * @apiParam (Sensor) {String} unit the unit of the phenomenon the sensor observes.
 * @apiParam (Sensor) {String} sensorType the type of the sensor.
 * @apiParam (Sensor) {String} [icon] the visual representation for the openSenseMap of this sensor.
 *
 */

/**
 * @apiDefine SensorsArray
 *
 * @apiSuccess {Sensor[]} sensors
 * @apiSuccess {String} sensors._id
 * @apiSuccess {String} sensors.title
 * @apiSuccess {String} sensors.sensorType
 * @apiSuccess {String} sensors.unit
 * @apiSuccess {String} sensors.icon
 */

/**
 * @apiDefine SensorIdParam
 *
 * @apiParam {String} sensorId the ID of the sensor you are referring to.
 */

/**
 * @api {delete} /boxes/:senseBoxId/:sensorId/measurements Delete measurements of a sensor
 * @apiDescription This method allows to delete measurements for the specified sensor. Use the request body to specify which measurements should be deleted.
 * @apiName deleteMeasurements
 * @apiGroup Measurements
 * @apiUse JWTokenAuth
 * @apiUse ContentTypeJSON
 * @apiUse BoxIdParam
 * @apiUse SensorIdParam
 * @apiParam (RequestBody) {RFC3339Date} [from-date] Beginning date of measurement data (no default)
 * @apiParam (RequestBody) {RFC3339Date} [to-date] End date of measurement data (no default)
 * @apiParam (RequestBody) {RFC3339Date[]} [timestamps] Allows to specify timestamps which should be deleted
 * @apiParam (RequestBody) {Boolean=true,false} [deleteAllMeasurements=false] Specify `deleteAllMeasurements` with a value of `true` to delete all measurements of this sensor
 */
const deleteSensorData = async function deleteSensorData (req, res) {
  try {
    const box = await Box.findBoxById(req._userParams.boxId, { lean: false });
    const message = await box.deleteMeasurementsOfSensor(req._userParams);
    res.send({ code: 'Ok', message });
  } catch (err) {
    return handleError(err);
  }
};

module.exports = {
  deleteSensorData: [
    checkContentType,
    retrieveParameters([
      { predef: 'boxId', required: true },
      { predef: 'sensorId', required: true },
      { name: 'deleteAllMeasurements' },
      { name: 'timestamps', dataType: ['RFC 3339'] },
      { predef: 'toDateNoDefault' },
      { predef: 'fromDateNoDefault' }
    ]),
    validateFromToTimeParams,
    checkPrivilege,
    deleteSensorData
  ]
};
