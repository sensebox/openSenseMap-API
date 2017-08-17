'use strict';

const { BadRequestError, InternalServerError, NotFoundError } = require('restify-errors'),
  models = require('../models'),
  { checkContentType } = require('../helpers/apiUtils'),
  { retrieveParameters, validateFromToTimeParams, checkBoxIdOwner } = require('../helpers/userParamHelpers');

const { Measurement, Box } = models;

const CONTACT_ADMIN_MSG = 'If you feel your box may be in inconsistent state, please contact the administrator.';
const DELETE_UNSUCCESSFUL_ERROR = 'Delete operation partially unsuccessful. This usually means some criteria you specified didn\'t yield measurements to delete or the sensor had no measurements. This can happen, if you send the same request twice.';
const UPDATE_BOX_UNSUCCESSFUL_ERROR = 'Couldn\'t find the sensor for updating the lastMeasurement.';

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
  const { boxId, sensorId, deleteAllMeasurements, timestamps, fromDate, toDate } = req._userParams;

  const reallyDeleteAllMeasurements = (deleteAllMeasurements === 'true');
  // check for instruction exclusivity
  if (reallyDeleteAllMeasurements === true && (timestamps || (fromDate && toDate))) {
    return next(new BadRequestError('deleteAllMeasurements can only be used by itself'));
  } else if (reallyDeleteAllMeasurements === false && timestamps && fromDate && toDate) {
    return next(new BadRequestError('please specify only timestamps or a range with from-date and to-date'));
  } else if (reallyDeleteAllMeasurements === false && !timestamps && !fromDate && !toDate) {
    return next(new BadRequestError('deleteAllMeasurements not true. deleting nothing'));
  }

  let successMsg = 'all measurements',
    mode = 'all';
  let createdAt;

  if (timestamps) {
    createdAt = {
      $in: timestamps.map(t => t.toDate())
    };
    successMsg = `${timestamps.length} measurements`;
    mode = 'timestamps';
  }

  if (fromDate && toDate) {
    createdAt = {
      $gt: fromDate.toDate(),
      $lt: toDate.toDate()
    };
    successMsg = `measurements between ${fromDate.format()} and ${toDate.format()}`;
    mode = 'range';
  }

  let deleteError = false;

  Measurement.deleteMeasurementsOfSensor(sensorId, createdAt)
    .then(function (deleteErrors) {
      deleteError = deleteErrors.includes('DELETE_ERROR');

      // nothing removed -> lastMeasurement should not be updated
      if (deleteErrors.includes('NO_MATCHING_MEASUREMENTS')) {
        throw new NotFoundError('no matching measurements for specified query');
      }

      return Box.findByIdAndUpdateLastMeasurementOfSensor(boxId, sensorId, (mode !== 'all'));
    })
    .then(function () {
      let responseMessage = `Successfully deleted ${successMsg} of sensor ${sensorId} of senseBox ${boxId}`;

      if (deleteError === true) {
        responseMessage = `${DELETE_UNSUCCESSFUL_ERROR} ${CONTACT_ADMIN_MSG}`;
      }

      res.send(200, { code: 'Ok', message: responseMessage });
    })
    .catch(function (err) {
      if (err.message === 'SENSOR_NOT_FOUND') {
        let responseMessage = UPDATE_BOX_UNSUCCESSFUL_ERROR;
        if (deleteError === true) {
          responseMessage = `${DELETE_UNSUCCESSFUL_ERROR} ${responseMessage}`;
        }

        return res.send(200, { code: 'Ok', message: `${responseMessage} ${CONTACT_ADMIN_MSG}` });
      }

      if (err.name === 'NotFoundError') {
        return next(err);
      }

      return next(new InternalServerError(err));
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
