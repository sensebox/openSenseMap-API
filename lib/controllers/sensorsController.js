'use strict';

const restify = require('restify'),
  models = require('../models'),
  { Honeybadger } = require('../utils'),
  { checkContentType } = require('../helpers/apiUtils'),
  { retrieveParameters, validateFromToTimeParams } = require('../helpers/userParamHelpers'),
  log = require('../log');

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
  const { boxId, sensorId, deleteAllMeasurements, timestamps, 'from-date': fromDate, 'to-date': toDate } = req._userParams;

  if (boxId && sensorId) {
    const reallyDeleteAllMeasurements = (typeof deleteAllMeasurements === 'boolean' && deleteAllMeasurements === true);
    // check for instruction exclusivity
    if (reallyDeleteAllMeasurements === true && (timestamps || (fromDate && toDate))) {
      return next(new restify.BadRequestError('deleteAllMeasurements can only be used by itself'));
    } else if (reallyDeleteAllMeasurements === false && timestamps && fromDate && toDate) {
      return next(new restify.BadRequestError('please specify only timestamps or a range with from-date and to-date'));
    } else if (deleteAllMeasurements === false && !timestamps && !fromDate && !toDate) {
      return next(new restify.BadRequestError('deleteAllMeasurements not true. deleting nothing'));
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
          throw new restify.NotFoundError('no matching measurements for specified query');
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

        log.error(err);
        Honeybadger.notify(err);

        return next(new restify.InternalServerError(err.message));
      });

  } else {
    return next(new restify.UnprocessableEntityError('missing required parameters boxId or sensorId'));
  }

};

module.exports = {
  deleteSensorData: [
    requestUtils.checkContentType,
    requestUtils.retrieveParameters([
      { name: 'deleteAllMeasurements', dataType: 'as-is' },
      { name: 'timestamps', dataType: ['ISO8601'] }
    ]),
    requestUtils.parseAndValidateTimeParamsOptional,
    deleteSensorData
  ]
};
