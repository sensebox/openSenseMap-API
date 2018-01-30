'use strict';

/**
 * @apiDefine ExposureFilterParam
 * @apiParam {String="indoor","outdoor","mobile","unknown"} [exposure] only include boxes with this exposure.
 */

/**
 * MQTT broker integration data
 * @apiDefine MqttOption Settings for a senseBox connected through MQTT
 */

/**
 * @apiDefine MqttBody
 *
 * @apiParam (MqttOption) {Boolean} enabled="false" enable or disable mqtt
 * @apiParam (MqttOption) {String} url the url to the mqtt server.
 * @apiParam (MqttOption) {String} topic the topic to subscribe to.
 * @apiParam (MqttOption) {String="json","csv"} messageFormat the format the mqtt messages are in.
 * @apiParam (MqttOption) {String} decodeOptions a json encoded string with options for decoding the message. 'jsonPath' for 'json' messageFormat.
 * @apiParam (MqttOption) {String} connectionOptions a json encoded string with options to supply to the mqtt client (https://github.com/mqttjs/MQTT.js#client)
 */

/**
 * thethingsnetwork.org integration data
 * @apiDefine TTNOption Settings for a senseBox connected through thethingsnetwork.org (TTN)
 */

/**
 * @apiDefine TTNBody
 *
 * @apiParam (TTNOption) {String} dev_id The device ID recieved from TTN
 * @apiParam (TTNOption) {String} app_id The application ID recieved from TTN
 * @apiParam (TTNOption) {String="lora-serialization","sensebox/home","json","debug"} profile A decoding profile matching the payload format. For details and configuration see https://github.com/sensebox/ttn-osem-integration#decoding-profiles
 * @apiParam (TTNOption) {Array}  [decodeOptions] A JSON Array containing decoder configuration, needed for some profiles.
 * @apiParam (TTNOption) {Number} [port] The TTN port to listen for messages. Optional, if not provided, all ports are used.
 */

const
  { Box } = require('@sensebox/opensensemap-api-models'),
  { addCache, clearCache, checkContentType, redactEmail, postToSlack } = require('../helpers/apiUtils'),
  { point } = require('@turf/helpers'),
  classifyTransformer = require('../transformers/classifyTransformer'),
  {
    retrieveParameters,
    parseAndValidateTimeParamsForFindAllBoxes,
    validateFromToTimeParams,
    checkBoxIdOwner
  } = require('../helpers/userParamHelpers'),
  handleError = require('../helpers/errorHandler'),
  jsonstringify = require('stringify-stream');

/**
 * @apiDefine Addons
 * @apiParam {String="feinstaub"} addon specify a sensor addon for a box.
 */

/**
 * @api {put} /boxes/:senseBoxId Update a senseBox
 * @apiDescription Modify the specified senseBox.
 *
 * @apiUse SensorBody
 * @apiUse LocationBody
 * @apiUse MqttBody
 * @apiUse TTNBody
 *
 * @apiParam (RequestBody) {String} [name] the name of this senseBox.
 * @apiParam (RequestBody) {String} [grouptag] the grouptag of this senseBox. Send '' (empty string) to delete this property.
 * @apiParam (RequestBody) {Location} [location] the new coordinates of this senseBox. Measurements will keep the reference to their correct location
 * @apiParam (RequestBody) {Sensor[]} [sensors] an array containing the sensors of this senseBox. Only use if model is unspecified
 * @apiParam (RequestBody) {MqttOption} [mqtt] settings for the MQTT integration of this senseBox
 * @apiParam (RequestBody) {TTNOption} [ttn] settings for the TTN integration of this senseBox
 * @apiParam (RequestBody) {String} [description] the updated description of this senseBox. Send '' (empty string) to delete this property.
 * @apiParam (RequestBody) {String} [image] the updated image of this senseBox encoded as base64 data uri.
 * @apiParam (RequestBody) {Object} [addons] allows to add addons to the box. Submit as Object with key `add` and the desired addon as value like `{"add":"feinstaub"}`
 * @apiParamExample {json} Request-Example:
 * {
 *  "_id": "56e741ff933e450c0fe2f705",
 *  "name": "my senseBox",
 *  "description": "this is just a description",
 *  "weblink": "https://opensensemap.org/explore/561ce8acb3de1fe005d3d7bf",
 *  "grouptag": "senseBoxes99",
 *  "exposure": "indoor",
 *  "sensors": [
 *    {
 *      "_id": "56e741ff933e450c0fe2f707",
 *      "title": "UV-Intensität",
 *      "unit": "μW/cm²",
 *      "sensorType": "VEML6070",
 *      "icon": "osem-sprinkles"
 *    }
 *  ],
 *  "location": {
 *    "lng": 8.6956,
 *    "lat": 50.0430
 *  },
 *  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAIVBMVEUAAABKrkMGteh0wW5Ixu931vKy3bO46fj/7hr/+J36/vyFw5EiAAAAAXRSTlMAQObYZgAAAF5JREFUeAFdjdECgzAIA1kIUvP/HzyhdrPe210L2GLYzhjj7VvRefmpn1MKFbdHUOzA9qRQEhIw3xMzEVeJDqkOrC9IJqWE7hFDLZ0Q6+zh7odsoU/j9qeDPXDf/cEX1xsDKIqAkK8AAAAASUVORK5CYII=",
 *  "mqtt": {
 *    "url": "some url",
 *    "topic": "some topic",
 *    "messageFormat": "json",
 *    "decodeOptions": "{\"jsonPath\":\"$.bla\"}"
 *  }
 *  "ttn": {
 *    "app_id": "my-app-id-from-ttn",
 *    "dev_id": "my-dev-id-from-ttn",
 *    "profile": "sensebox/home",
 *    "decodeOptions": "{\"jsonPath\":\"$.bla\"}"
 *  },
 *  "addons": { "add": "feinstaub" }
 * }
 * @apiGroup Boxes
 * @apiName updateBox
 * @apiUse JWTokenAuth
 * @apiUse BoxIdParam
 * @apiUse ContentTypeJSON
 *
 */
const updateBox = function updateBox (req, res, next) {
  Box.findBoxById(req._userParams.boxId, { lean: false, populate: false })
    .then(function (box) {
      return box.updateBox(req._userParams);
    })
    .then(function (updatedBox) {
      if (updatedBox._sensorsChanged === true) {
        req.user.mail('newSketch', updatedBox);
      }

      res.send({ code: 'Ok', data: updatedBox.toJSON({ includeSecrets: true }) });
      clearCache(['getBoxes']);
    })
    .catch(function (err) {
      handleError(err, next);
    });
};

/**
 * @api {get} /boxes/:senseBoxId/locations Get locations of a senseBox
 * @apiGroup Boxes
 * @apiName getBoxLocations
 * @apiDescription Get all locations of the specified senseBox ordered by date as an array of GeoJSON Points.
 * If `format=geojson`, a GeoJSON linestring will be returned, with `properties.timestamps`
 * being an array with the timestamp for each coordinate.
 *
 * @apiParam {String=json,geojson} format=json
 * @apiParam {RFC3339Date} [from-date] Beginning date of location timestamps (default: 48 hours ago from now)
 * @apiParam {RFC3339Date} [to-date] End date of location timstamps (default: now)
 * @apiUse BoxIdParam
 *
 * @apiSuccessExample {application/json} Example response for :format=json
 * [
 *   { "coordinates": [7.68123, 51.9123], "type": "Point", "timestamp": "2017-07-27T12:00:00Z"},
 *   { "coordinates": [7.68223, 51.9433, 66.6], "type": "Point", "timestamp": "2017-07-27T12:01:00Z"},
 *   { "coordinates": [7.68323, 51.9423], "type": "Point", "timestamp": "2017-07-27T12:02:00Z"}
 * ]
 */
const getBoxLocations = function getBoxLocations (req, res, next) {
  Box.findBoxById(req._userParams.boxId, { onlyLocations: true, lean: false })
    .then(function (box) {
      return box.getLocations(req._userParams);
    })
    .then(function (locations) {
      res.send(locations);
    })
    .catch(function (err) {
      handleError(err, next);
    });
};

const geoJsonStringifyReplacer = function geoJsonStringifyReplacer (key, box) {
  if (key === '') {
    const coordinates = box.currentLocation.coordinates;
    box.currentLocation = undefined;
    box.loc = undefined;

    return point(coordinates, box);
  }

  return box;
};

/**
 * @api {get} /boxes?date=:date&phenomenon=:phenomenon&format=:format Get all senseBoxes
 * @apiDescription With the optional `date` and `phenomenon` parameters you can find senseBoxes that have submitted data around that time, +/- 4 hours, or specify two dates separated by a comma.
 * @apiName getBoxes
 * @apiGroup Boxes
 * @apiParam {RFC3339Date} [date] One or two RFC 3339 timestamps at which boxes should provide measurements. Use in combination with `phenomenon`.
 * @apiParam {String} [phenomenon] A sensor phenomenon (determined by sensor name) such as temperature, humidity or UV intensity. Use in combination with `date`.
 * @apiParam {String=json,geojson} [format=json] the format the sensor data is returned in.
 * @apiParam {String} [grouptag] only return boxes with this grouptag, allows to specify multiple separated with a comma
 * @apiParam {String="homeEthernet","homeWifi","homeEthernetFeinstaub","homeWifiFeinstaub","luftdaten_sds011","luftdaten_sds011_dht11","luftdaten_sds011_dht22","luftdaten_sds011_bmp180","luftdaten_sds011_bme280"} [model] only return boxes with this model, allows to specify multiple separated with a comma
 * @apiParam {Boolean="true","false"} [classify] if specified, the api will classify the boxes accordingly to their last measurements.
 * @apiUse ExposureFilterParam
 * @apiSampleRequest https://api.opensensemap.org/boxes
 * @apiSampleRequest https://api.opensensemap.org/boxes?date=2015-03-07T02:50Z&phenomenon=Temperatur
 * @apiSampleRequest https://api.opensensemap.org/boxes?date=2015-03-07T02:50Z,2015-04-07T02:50Z&phenomenon=Temperatur
 */
const getBoxes = function getBoxes (req, res, next) {
  // content-type is always application/json for this route
  res.header('Content-Type', 'application/json; charset=utf-8');

  // default format
  let stringifier = jsonstringify({ open: '[', close: ']' });
  // format
  if (req._userParams.format === 'geojson') {
    stringifier = jsonstringify({ open: '{"type":"FeatureCollection","features":[', close: ']}' }, geoJsonStringifyReplacer);
  }

  Box.findBoxesLastMeasurements(req._userParams)
    .then(function (stream) {

      if (req._userParams.classify === 'true') {
        stream = stream
          .pipe(classifyTransformer())
          .on('error', function (err) {
            res.end(`Error: ${err.message}`);
          });
      }

      stream
        .pipe(stringifier)
        .on('error', function (err) {
          res.end(`Error: ${err.message}`);
        })
        .pipe(res);
    })
    .catch(function (err) {
      handleError(err, next);
    });
};

/**
 * @api {get} /boxes/:senseBoxId?format=:format Get one senseBox
 * @apiName getBox
 * @apiGroup Boxes
 *
 * @apiUse BoxIdParam
 * @apiParam {String=json,geojson} [format=json] The format the sensor data is returned in. If `geojson`, a GeoJSON Point Feature is returned.
 *
 * @apiSuccessExample Example data on success:
 * {
  "_id": "57000b8745fd40c8196ad04c",
  "createdAt": "2016-06-02T11:22:51.817Z",
  "exposure": "outdoor",
  "grouptag": "",
  "image": "57000b8745fd40c8196ad04c.png?1466435154159",
  "currentLocation": {
    "coordinates": [
      7.64568,
      51.962372
    ],
    "timestamp": "2016-06-02T11:22:51.817Z",
    "type": "Point"
  },
  "name": "Oststr/Mauritzsteinpfad",
  "sensors": [
    {
      "_id": "57000b8745fd40c8196ad04e",
      "lastMeasurement": {
        "value": "0",
        "createdAt": "2016-11-11T21:22:01.675Z"
      },
      "sensorType": "VEML6070",
      "title": "UV-Intensität",
      "unit": "μW/cm²"
    },
    {
      "_id": "57000b8745fd40c8196ad04f",
      "lastMeasurement": {
        "value": "0",
        "createdAt": "2016-11-11T21:22:01.675Z"
      },
      "sensorType": "TSL45315",
      "title": "Beleuchtungsstärke",
      "unit": "lx"
    },
    {
      "_id": "57000b8745fd40c8196ad050",
      "lastMeasurement": {
        "value": "1019.21",
        "createdAt": "2016-11-11T21:22:01.675Z"
      },
      "sensorType": "BMP280",
      "title": "Luftdruck",
      "unit": "hPa"
    },
    {
      "_id": "57000b8745fd40c8196ad051",
      "lastMeasurement": {
        "value": "99.38",
        "createdAt": "2016-11-11T21:22:01.675Z"
      },
      "sensorType": "HDC1008",
      "title": "rel. Luftfeuchte",
      "unit": "%"
    },
    {
      "_id": "57000b8745fd40c8196ad052",
      "lastMeasurement": {
        "value": "0.21",
        "createdAt": "2016-11-11T21:22:01.675Z"
      },
      "sensorType": "HDC1008",
      "title": "Temperatur",
      "unit": "°C"
    },
    {
      "_id": "576996be6c521810002479dd",
      "sensorType": "WiFi",
      "unit": "dBm",
      "title": "Wifi-Stärke",
      "lastMeasurement": {
        "value": "-66",
        "createdAt": "2016-11-11T21:22:01.675Z"
      }
    },
    {
      "_id": "579f9eae68b4a2120069edc8",
      "sensorType": "VCC",
      "unit": "V",
      "title": "Eingangsspannung",
      "lastMeasurement": {
        "value": "2.73",
        "createdAt": "2016-11-11T21:22:01.675Z"
      },
      "icon": "osem-shock"
    }
  ],
  "updatedAt": "2016-11-11T21:22:01.686Z"
}
 */

const getBox = function getBox (req, res, next) {
  const { format, boxId } = req._userParams;

  Box.findBoxById(boxId, { format })
    .then(function (box) {
      res.send(box);
    })
    .catch(function (err) {
      handleError(err, next);
    });
};

/**
 * @api {post} /boxes Post new senseBox
 * @apiGroup Boxes
 * @apiName postNewBox
 * @apiDescription Create a new senseBox. This method allows you to submit a new senseBox.
 *
 * ### MQTT Message formats
 * If you specify `mqtt` parameters, the openSenseMap API will try to connect to the MQTT broker
 * specified by you. The parameter `messageFormat` tells the API in which format you are sending
 * measurements in. The accepted formats are listed under `Measurements/Post mutliple new Measurements`
 *
 * @apiParam (RequestBody) {String} name the name of this senseBox.
 * @apiParam (RequestBody) {String} [grouptag] the grouptag of this senseBox.
 * @apiParam (RequestBody) {String="indoor","outdoor","mobile","unknown"} exposure the exposure of this senseBox.
 * @apiParam (RequestBody) {Location} location the coordinates of this senseBox.
 * @apiParam (RequestBody) {String="homeEthernet","homeWifi","homeEthernetFeinstaub","homeWifiFeinstaub","luftdaten_sds011","luftdaten_sds011_dht11","luftdaten_sds011_dht22","luftdaten_sds011_bmp180","luftdaten_sds011_bme280"} [model] specify the model if you want to use a predefined senseBox model, autocreating sensor definitions.
 * @apiParam (RequestBody) {Sensor[]} [sensors] an array containing the sensors of this senseBox. Only use if `model` is unspecified.
 * @apiParam (RequestBody) {Object} [mqtt] specify parameters of the MQTT integration for external measurement upload. Please see below for the accepted parameters
 * @apiParam (RequestBody) {Object} [ttn] specify parameters for the TTN integration for measurement from TheThingsNetwork.org upload. Please see below for the accepted parameters
 *
 * @apiUse LocationBody
 * @apiUse SensorBody
 * @apiUse MqttBody
 * @apiUse TTNBody
 * @apiUse ContentTypeJSON
 * @apiUse JWTokenAuth
 */
const postNewBox = function postNewBox (req, res, next) {
  req.user.addBox(req._userParams)
    .then(function (newBox) {
      return Box.populate(newBox, Box.BOX_SUB_PROPS_FOR_POPULATION);
    })
    .then(function (newBox) {
      res.send(201, { message: 'Box successfully created', data: newBox });
      clearCache(['getBoxes', 'getStats']);
      postToSlack(`New Box: ${req.user.name} (${redactEmail(req.user.email)}) just registered "${newBox.name}" (${newBox.model}): <https://opensensemap.org/explore/${newBox._id}|link>`);
    })
    .catch(function (err) {
      handleError(err, next);
    });
};

/**
 * @api {get} /boxes/:senseBoxId/script Download the Arduino script for your senseBox
 * @apiName getSketch
 * @apiGroup Boxes
 * @apiUse JWTokenAuth
 * @apiUse BoxIdParam
 */
const getSketch = function getSketch (req, res, next) {
  res.header('Content-Type', 'text/plain; charset=utf-8');
  Box.findBoxById(req._userParams.boxId, { populate: false, lean: false })
    .then(function (box) {
      res.send(box.getSketch());
    })
    .catch(function (err) {
      handleError(err, next);
    });
};

/**
 * @api {delete} /boxes/:senseBoxId Mark a senseBox and its measurements for deletion
 * @apiDescription This will delete all the measurements of the senseBox. Please not that the deletion isn't happening immediately.
 * @apiName deleteBox
 * @apiGroup Boxes
 * @apiUse ContentTypeJSON
 * @apiParam {String} password the current password for this user.
 * @apiUse JWTokenAuth
 * @apiUse BoxIdParam
 */
const deleteBox = function deleteBox (req, res, next) {
  const { password, boxId } = req._userParams;

  req.user.checkPassword(password)
    .then(function () {
      return req.user.removeBox(boxId);
    })
    .then(function () {
      res.send({ code: 'Ok', message: 'box and all associated measurements marked for deletion' });
      clearCache(['getBoxes', 'getStats']);
      postToSlack(`Box deleted: ${req.user.name} (${redactEmail(req.user.email)}) just deleted ${boxId}`);
    })
    .catch(function (err) {
      handleError(err, next);
    });
};

module.exports = {
  // auth required
  deleteBox: [
    checkContentType,
    retrieveParameters([
      { predef: 'boxId', required: true },
      { predef: 'password' }
    ]),
    checkBoxIdOwner,
    deleteBox
  ],
  getSketch: [
    retrieveParameters([
      { predef: 'boxId', required: true },
    ]),
    checkBoxIdOwner,
    getSketch
  ],
  updateBox: [
    checkContentType,
    retrieveParameters([
      { predef: 'boxId', required: true },
      { name: 'name' },
      { name: 'grouptag', dataType: 'StringWithEmpty' },
      { name: 'description', dataType: 'StringWithEmpty' },
      { name: 'weblink', dataType: 'StringWithEmpty' },
      { name: 'image', dataType: 'base64Image' },
      { name: 'exposure', allowedValues: Box.BOX_VALID_EXPOSURES },
      { name: 'mqtt', dataType: 'object' },
      { name: 'ttn', dataType: 'object' },
      { name: 'sensors', dataType: ['object'] },
      { name: 'addons', dataType: 'object' },
      { predef: 'location' }
    ]),
    checkBoxIdOwner,
    updateBox
  ],
  // no auth required
  getBoxLocations: [
    retrieveParameters([
      { predef: 'boxId', required: true },
      { name: 'format', defaultValue: 'json', allowedValues: ['json', 'geojson'] },
      { predef: 'toDate' },
      { predef: 'fromDate' },
      validateFromToTimeParams,
    ]),
    getBoxLocations
  ],
  postNewBox: [
    checkContentType,
    retrieveParameters([
      { name: 'name', required: true },
      { name: 'grouptag', aliases: ['tag'] },
      { name: 'exposure', allowedValues: Box.BOX_VALID_EXPOSURES },
      { name: 'model', allowedValues: Box.BOX_VALID_MODELS },
      { name: 'sensors', dataType: ['object'] },
      { name: 'mqtt', dataType: 'object' },
      { name: 'ttn', dataType: 'object' },
      { predef: 'location', required: true }
    ]),
    postNewBox
  ],
  getBox: [
    retrieveParameters([
      { predef: 'boxId', required: true },
      { name: 'format', defaultValue: 'json', allowedValues: ['json', 'geojson'] }
    ]),
    getBox
  ],
  getBoxes: [
    retrieveParameters([
      { name: 'exposure', allowedValues: Box.BOX_VALID_EXPOSURES, dataType: 'StringWithEmpty' },
      { name: 'model', dataType: ['StringWithEmpty'] },
      { name: 'grouptag', dataType: ['StringWithEmpty'] },
      { name: 'phenomenon', dataType: 'StringWithEmpty' },
      { name: 'date', dataType: ['RFC 3339'] },
      { name: 'format', defaultValue: 'json', allowedValues: ['json', 'geojson'] },
      { name: 'classify', defaultValue: 'true', allowedValues: ['true', 'false'] },
    ]),
    parseAndValidateTimeParamsForFindAllBoxes,
    addCache('5 minutes', 'getBoxes'),
    getBoxes
  ]
};
