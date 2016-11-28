'use strict';

const restify = require('restify'),
  models = require('../models'),
  Honeybadger = require('../utils').Honeybadger,
  requestUtils = require('../requestUtils');

const { Measurement, Box } = models;

const DELETE_UNSUCCESSFUL_ERROR = 'Delete operation partially unsuccessful. This usually means some criteria you gave didn\'t yield measurements to delete or the sensor had no measurements. This can happen, if you send the same request twice. If you feel your box may be in inconsistent state, please contact the administrator.';

const deleteSensorData = function deleteSensorData (req, res, next) {
  const { boxId, sensorId, deleteAllMeasurements, timestamps } = req._userParams;
  const fromDate = req._userParams['from-date'],
    toDate = req._userParams['to-date'];

  if (boxId && sensorId) {

    // check for instruction exclusivity
    if (deleteAllMeasurements && deleteAllMeasurements === 'true' && (timestamps || (fromDate && toDate))) {
      return next(new restify.BadRequestError('deleteAllMeasurements can only be used by itself'));
    } else if (!deleteAllMeasurements && timestamps && fromDate && toDate) {
      return next(new restify.BadRequestError('please specify only timestamps or a range with from-date and to-date'));
    } else if ((deleteAllMeasurements && deleteAllMeasurements !== 'true') || !deleteAllMeasurements && !timestamps && !fromDate && !toDate) {
      return next(new restify.BadRequestError('deleteAllMeasurements not true. deleting nothing'));
    }

    let successMsg = 'all measurements',
      mode = 'all';
    const query = {
      sensor_id: sensorId
    };

    if (timestamps) {
      query.createdAt = {
        $in: timestamps.map(t => t.toDate())
      };
      successMsg = `${timestamps.length} measurements`;
      mode = 'timestamps';
    }

    if (fromDate && toDate) {
      query.createdAt = {
        $gt: fromDate.toDate(),
        $lt: toDate.toDate()
      };
      successMsg = `measurements between ${fromDate.format()} and ${toDate.format()}`;
      mode = 'range';
    }

    let deleteError = false;

    // delete measurements
    Measurement.find(query)
     .remove()
     .exec()
     .then(function (removeResult) {
       // nothing removed -> lastMeasurement should not be updated
       if (removeResult && removeResult.result && removeResult.result.n === 0) {
         throw new restify.BadRequestError('no matching measurements for specified query');
       }
       // check for not ok deletion
       deleteError = (removeResult.result.ok !== 1);

       // determine what to do with lastMeasurement..
       let newLastMeasurementPromise = Promise.resolve([{ _id: undefined }]);
       if (mode !== 'all') {
         // find the latest Measurement
         newLastMeasurementPromise = Measurement.find({ sensor_id: sensorId })
           .sort({ createdAt: -1 })
           .limit(1)
           .exec();
       }

       return newLastMeasurementPromise;

     })
     .then(function (newLastMeasurement) {
       // update lastMeasurement field in Box
       return Box.findById(boxId)
         .populate('sensor.lastMeasurement')
         .exec()
         .then(function (box) {
           let sensorFound = false;
           // apply the found new lastMeasurement
           for (const sensor of box.sensors) {
             if (sensor._id.equals(sensorId)) {
               sensor.lastMeasurement = newLastMeasurement[0]._id;
               sensorFound = true;
               break;
             }
           }
           if (sensorFound === false) {
             throw new restify.InternalServerError('couldn\'t find the sensor for updating the lastMeasurement');
           }

           return box.save();
         });
     })
     .then(function () {
       let responseMessage = `Successfully deleted ${successMsg} of sensor ${sensorId} of senseBox ${boxId}`;

       if (deleteError === true) {
         responseMessage = DELETE_UNSUCCESSFUL_ERROR;
       }

       res.send(200, { code: 200, message: responseMessage });
     })
     .catch(function (err) {
       if (err.name === 'BadRequestError' || err.name === 'InternalServerError') {
         return next(err);
       }
       console.log(err);
       Honeybadger.notify(err);

       return next(new restify.InternalServerError(err));
     });

  } else {
    return next(new restify.UnprocessableEntityError('missing required parameters boxId or sensorId'));
  }

};

module.exports = {
  deleteSensorData: [
    requestUtils.checkContentType,
    requestUtils.retrieveParameter('deleteAllMeasurements', 'String'),
    requestUtils.retrieveParameter('timestamps', 'Array,ISO8601'),
    requestUtils.parseAndValidateTimeParamsOptional,
    deleteSensorData
  ]
};
