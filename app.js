var restify = require('restify'),
  mongoose = require('mongoose'),
  fs = require('fs'),
  GeoJSON = require('geojson'),
  _ = require('lodash'),
  products = require('./products'),
  cfg = require('./config'),
  schemas = require('./schemas'),
  //json2csv = require('json2csv'),
  csvstringify = require('csv-stringify'),
  csvgenerate = require('csv-generate'),
  Stream = require('stream'),
  nodemailer = require('nodemailer'),
  smtpTransport = require('nodemailer-smtp-transport'),
  htmlToText = require('nodemailer-html-to-text').htmlToText,
  moment = require('moment'),
  request = require('request');

mongoose.Promise = require('bluebird');
var dbHost = process.env.DB_HOST || cfg.dbhost;

/*
  Logging
*/
var consoleStream = new Stream();
consoleStream.writable = true;
consoleStream.write = function(obj) {
  if(obj.req){
    console.log(obj.time, obj.req.remoteAddress, obj.req.method, obj.req.url);
  } else if(obj.msg) {
    console.log(obj.time, obj.msg);
  } else {
    //console.log(obj.time, obj);
  }
};

var Logger = require('bunyan'),
  reqlog = new Logger.createLogger({
    name: 'OSeM-API',
    streams: [
      { level: 'debug', type: 'raw', stream: consoleStream }
    ],
    serializers: {
      err: Logger.stdSerializers.err,
      req: Logger.stdSerializers.req,
      res: Logger.stdSerializers.res
    }
  }),
  log = new Logger.createLogger({
    name: 'OSeM-API',
    streams: [
      { level: 'debug', type: 'raw', stream: consoleStream }
    ],
    serializers: {
      err: Logger.stdSerializers.err,
      req: Logger.stdSerializers.req,
      res: Logger.stdSerializers.res
    }
  });

var server = restify.createServer({
  name: 'opensensemap-api',
  version: '0.0.1',
  log: reqlog
});
server.use(restify.CORS({'origins': ['*'] })); //['http://localhost', 'https://opensensemap.org']}));
server.use(restify.fullResponse());
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.pre(function(request, response, next) {
  response.charSet('utf-8');
  request.log.info({req: request}, 'REQUEST');
  return next();
});

// use this function to retry if a connection cannot be established immediately
var connectWithRetry = function () {
  return mongoose.connect(cfg.dbconnectionstring, {
    keepAlive: 1
  }, function (err) {
    if (err) {
      console.error('Failed to connect to mongo on startup - retrying in 5 sec', err);
      setTimeout(connectWithRetry, 5000);
    }
  });
};

conn = connectWithRetry();

var LocationSchema = schemas.LocationSchema;
var measurementSchema = schemas.measurementSchema;
var sensorSchema = schemas.sensorSchema;
var boxSchema = schemas.boxSchema;
var userSchema = schemas.userSchema;

var Measurement = mongoose.model('Measurement', measurementSchema);
var Box = mongoose.model('Box', boxSchema);
var Sensor = mongoose.model('Sensor', sensorSchema);
var User = mongoose.model('User', userSchema);
var Location = mongoose.model('Location', LocationSchema);

var PATH = '/boxes';
var userPATH = 'users';

// GET
server.get({path : PATH , version : '0.0.1'} , findAllBoxes);
server.get({path : /(boxes)\.([a-z]+)/, version : '0.1.0'} , findAllBoxes);
server.get({path : PATH +'/:boxId' , version : '0.0.1'} , findBox);
server.get({path : PATH +'/:boxId/sensors', version : '0.0.1'}, getMeasurements);
server.get({path : PATH +'/:boxId/data/:sensorId', version : '0.0.1'}, getData);
server.get({path : PATH +'/data', version : '0.1.0'}, getDataMulti);
server.get({path : userPATH +'/:boxId', version : '0.0.1'}, validApiKey);
server.get({path : PATH +'/:boxId/script', version : '0.1.0'}, getScript);
server.get({path : '/stats', version : '0.1.0'}, getStatistics);

// POST
server.post({path : PATH , version: '0.0.1'}, postNewBox);
server.post({path : PATH +'/:boxId/:sensorId' , version : '0.0.1'}, postNewMeasurement);
server.post({path : PATH +'/:boxId/data' , version : '0.1.0'}, postNewMeasurements);
server.post({path : PATH +'/data', version : '0.1.0'}, getDataMulti);

// PUT
server.put({path: PATH + '/:boxId' , version: '0.1.0'} , updateBox);

// DELETE
server.del({path: PATH + '/:boxId' , version: '0.1.0'} , deleteBox);

function unknownMethodHandler(req, res) {
  if (req.method.toLowerCase() === 'options') {
    var allowHeaders = ['Accept', 'X-ApiKey', 'Accept-Version', 'Content-Type', 'Api-Version', 'Origin', 'X-Requested-With']; // added Origin & X-Requested-With

    if (res.methods.indexOf('OPTIONS') === -1) res.methods.push('OPTIONS');

    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Headers', allowHeaders.join(', '));
    res.header('Access-Control-Allow-Methods', res.methods.join(', '));
    res.header('Access-Control-Allow-Origin', req.headers.origin);

    return res.send(204);
  } else {
    return res.send(new restify.MethodNotAllowedError());
  }
}

server.on('MethodNotAllowed', unknownMethodHandler);

/**
 * @api {get} /boxes/users/:boxId Check for valid API key
 * @apiDescription Check for valid API key. Will return status code 400 if invalid, 200 if valid.
 * @apiParam {ID} boxId SenseBox unique ID.
 * @apiHeader {ObjectId} x-apikey SenseBox specific apikey
 * @apiHeaderExample {json} Request-Example:
 *   {
 *     'X-ApiKey':54d3a96d5438b4440913434b
 *   }
 * @apiError {String} ApiKey is invalid!
 * @apiError {String} ApiKey not existing!
 * @apiSuccess {String} ApiKey is valid!
 * @apiVersion 0.0.1
 * @apiGroup Boxes
 * @apiName validApiKey
 */
function validApiKey (req,res,next) {
  User.findOne({apikey:req.headers['x-apikey']}, function (error, user) {
    if (error) {
      res.send(400, "ApiKey does not exist");
    }

    if (user && user.boxes.length > 0 && user.boxes.indexOf(req.params.boxId) != -1) {
      res.send(200, "ApiKey is valid");
    } else {
      res.send(400, "ApiKey is invalid");
    }
  });
}

function decodeBase64Image(dataString) {
  var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
    response = {};

  if (matches.length !== 3) {
    return new Error('Invalid input string');
  }

  response.type = matches[1];
  response.data = new Buffer(matches[2], 'base64');

  return response;
}

/**
 * @api {put} /boxes/:boxId Update a SenseBox: Image and sensor names
 * @apiDescription Modify the specified SenseBox.
 * @apiParam {ID} boxId SenseBox unique ID.
 * @apiHeader {ObjectId} x-apikey SenseBox specific apikey
 * @apiHeaderExample {json} Request-Example:
 *   {
 *     'X-ApiKey':54d3a96d5438b4440913434b
 *   }
 * @apiSampleRequest
 * {
 *  "_id": "56e741ff933e450c0fe2f705",
 *  "name": "MeineBox",
 *  "sensors": [
 *    {
 *      "_id": "56e741ff933e450c0fe2f707",
 *      "title": "UV-Intensität",
 *      "unit": "μW/cm²",
 *      "sensorType": "VEML6070",
 *    }
 *  ],
 *  "grouptag": "vcxyxsdf",
 *  "exposure": "outdoor",
 *  "loc": {
 *    "lng": 8.6956,
 *    "lat": 50.0430
 *  }
 * }
 * @apiVersion 0.0.1
 * @apiGroup Boxes
 * @apiName updateBox
 */
function updateBox(req, res, next) {
  /*
  var newBoxData = {
    _id
    name
    sensors
    description
    weblink
    grouptag
    exposure
    loc
    image
  };
  */

  User.findOne({apikey:req.headers["x-apikey"]}, function (error, user) {
    if (error) {
      res.send(400, "ApiKey does not exist");
    }
    var qrys = [];
    if (user.boxes.indexOf(req.params.boxId) !== -1) {
      Box.findById(req.params.boxId, function (err, box) {
        if (err) return handleError(err);

        if (typeof req.params.name !== 'undefined' && req.params.name !== "") {
          if(box.name !== req.params.name)
            qrys.push(box.set({name: req.params.name}));
        }
        if (typeof req.params.exposure !== 'undefined' && req.params.exposure !== "") {
          if(box.exposure !== req.params.exposure)
            qrys.push(box.set({exposure: req.params.exposure}));
        }
        if (typeof req.params.grouptag !== 'undefined' && req.params.grouptag !== "") {
          if(box.grouptag !== req.params.grouptag)
            qrys.push(box.set({grouptag: req.params.grouptag}));
        }
        if (typeof req.params.weblink !== 'undefined' && req.params.weblink !== "") {
          if(box.weblink !== req.params.weblink)
            qrys.push(box.set({weblink: req.params.weblink}));
        }
        if (typeof req.params.description !== 'undefined' && req.params.description !== "") {
          if(box.description !== req.params.description)
            qrys.push(box.set({description: req.params.description}));
        }
        if (typeof req.params.loc !== 'undefined' && req.params.loc !== "") {
          if(String(box.loc[0].geometry.coordinates[0]) !== req.params.loc.lng || String(box.loc[0].geometry.coordinates[1]) !== req.params.loc.lat){
            box.loc[0].geometry.coordinates = [req.params.loc.lng, req.params.loc.lat];
          }
        }
        if (typeof req.params.image !== 'undefined' && req.params.image !== "") {
          var data = req.params.image.toString();
          var imageBuffer = decodeBase64Image(data);
          var extension = (imageBuffer.type === 'image/jpeg') ? '.jpg' : '.png';
          try {
            fs.writeFileSync(cfg.imageFolder+""+req.params.boxId+extension, imageBuffer.data);
            qrys.push(box.set({image: req.params.boxId+extension+'?'+(new Date().getTime())}));
          } catch(e) {
            if (err) return handleError(e);
          }
        }
        if (typeof req.params.sensors !== 'undefined' && req.params.sensors.length>0) {
          req.params.sensors.forEach(function(updatedsensor){
            if(updatedsensor.deleted){
              qrys.push(Measurement.find({ sensor_id: updatedsensor._id }).remove());
              qrys.push(Box.update({'sensors._id': mongoose.Types.ObjectId(updatedsensor._id)},
                { $pull: { 'sensors': { _id: mongoose.Types.ObjectId(updatedsensor._id) } }
              }));
            } else if(updatedsensor.edited && updatedsensor.new) {
              var newsensor = new Sensor({
                'title': updatedsensor.title,
                'unit': updatedsensor.unit,
                'sensorType': updatedsensor.sensorType
              });
              box.sensors.push(newsensor);
            }else if(updatedsensor.edited && !updatedsensor.deleted){
              qrys.push(Box.update({'sensors._id': mongoose.Types.ObjectId(updatedsensor._id)}, {'$set': {
                  'sensors.$.title': updatedsensor.title,
                  'sensors.$.unit': updatedsensor.unit,
                  'sensors.$.sensorType': updatedsensor.sensorType
              }}));
            }
          });
        }
        qrys.push(box.save());
        Promise.all(qrys).then(function(){
          genScript(box, box.model);
          res.send(200, box);
        });
      });
    } else {
     res.send(400, "ApiKey does not match SenseBoxID");
    }
  });
}

/**
 * @api {get} /boxes/:boxId/sensors Get all last measurements
 * @apiDescription Get last measurements of all sensors of the secified SenseBox.
 * @apiVersion 0.0.1
 * @apiGroup Measurements
 * @apiName getMeasurements
 * @apiParam {ID} boxId SenseBox unique ID.
 */
function getMeasurements(req, res, next) {
  Box.findOne({_id: req.params.boxId},{sensors:1}).populate('sensors.lastMeasurement').exec(function(error,sensors){
    if (error) {
      return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
    } else {
      res.send(200, sensors);
    }
  });
}

/**
 * @api {get} /boxes/:boxId/data/:sensorId?from-date=:fromDate&to-date:toDate Get last n measurements for a sensor
 * @apiDescription Get up to 1000 measurements from a sensor for a specific time frame, parameters `from-date` and `to-date` are optional. If not set, the last 24 hours are used. The maximum time frame is 1 month. A maxmimum of 1000 values wil be returned for each request.
 * @apiVersion 0.0.1
 * @apiGroup Measurements
 * @apiName getData
 * @apiParam {ID} boxId SenseBox unique ID.
 * @apiParam {ID} sensorId Sensor unique ID.
 * @apiParam {String} from-date Beginning date of measurement data (default: 24 hours ago from now)
 * @apiParam {String} to-date End date of measurement data (default: now)
 * @apiParam {String} download If set, offer download to the user (default: false, always on if CSV is used)
 * @apiParam {String} format Can be 'JSON' (default) or 'CSV' (default: JSON)
 */
function getData(req, res, next) {
  'use strict'
  // default to now
  var toDate = (typeof req.params["to-date"] == 'undefined' || req.params["to-date"] == "") ? new Date() : new Date(req.params["to-date"]);
  // default to 48 hours earlier
  var fromDate = (typeof req.params["from-date"] == 'undefined' || req.params["from-date"] == "") ? new Date(toDate.valueOf() - 1000*60*60*48) : new Date(req.params["from-date"]);
  var format = (typeof req.params["format"] == 'undefined') ? "json" : req.params["format"].toLowerCase();

  log.debug(fromDate, "to", toDate);

  if (toDate.valueOf() < fromDate.valueOf()) {
    return next(new restify.InvalidArgumentError(JSON.stringify('Invalid time frame specified')));
  }
  if (toDate.valueOf()-fromDate.valueOf() > 1000*60*60*24*32) {
    return next(new restify.InvalidArgumentError(JSON.stringify('Please choose a time frame up to 31 days maximum')));
  }

  var queryLimit = 10000;
  var resultLimit = 10000;

  var generator = csvstringify({columns: ['createdAt', 'value']});
  var stringifier = csvstringify({header: 1, delimiter: ';'});

  var qry = {
    sensor_id: req.params.sensorId,
    createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) }
  };

  if(format == "csv") {
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename='+req.params.sensorId+'.csv');

    Measurement.find(qry,{"createdAt":1, "value":1, "_id": 0}) // do not send _id column
    .limit(queryLimit)
    .lean()
    .stream()
    .pipe(stringifier)
    .pipe(res);
  } else {
    res.header('Content-Type', 'application/json; charset=utf-8');
    if(typeof req.params["download"] != 'undefined' && req.params["download"]=="true"){
      // offer download to browser
      res.header('Content-Disposition', 'attachment; filename='+req.params.sensorId+'.'+format);
    }
    var returnlength = 0;
    Measurement.find(qry,{"createdAt":1, "value":1, "_id": 0}) // do not send _id column
    .limit(queryLimit)
    .lean()
    .stream({ // http://stackoverflow.com/a/34485539/1781026
      transform: () => {
        let index = 0;
        return (data) => {
          return (!(index++) ? '[' : ',') + JSON.stringify(data);
        };
      }() // invoke
    })
    .on('data', (data) => {
      returnlength = 1;
    })
    .on('end', (data) => {
      if(returnlength > 0) {
        res.write(']');
      } else {
        res.status(404);
        res.write('[]');
      }
    })
    .pipe(res);
  }
}

/**
 * @api {get,post} /boxes/data?boxid=:boxIdsfrom-date=:fromDate&to-date:toDate&phenomenon=:phenomenon Get last n measurements for a sensor
 * @apiDescription Download data from multiple boxes as CSV
 * @apiVersion 0.1.0
 * @apiGroup Measurements
 * @apiName getDataMulti
 * @apiParam {ID} boxId Comma separated list of SenseBox unique IDs.
 */
function getDataMulti(req, res, next) {
  'use strict'

  // default to now
  var toDate = (typeof req.params["to-date"] == 'undefined' || req.params["to-date"] == "") ? new Date() : new Date(req.params["to-date"]);
  // default to 24 hours earlier
  var fromDate = (typeof req.params["from-date"] == 'undefined' || req.params["from-date"] == "") ? new Date(toDate.valueOf() - 1000*60*60*24*15) : new Date(req.params["from-date"]);

  if (toDate.valueOf() < fromDate.valueOf()) {
    return next(new restify.InvalidArgumentError(JSON.stringify('Invalid time frame specified')));
  }
  if (toDate.valueOf()-fromDate.valueOf() > 1000*60*60*24*32) {
    return next(new restify.InvalidArgumentError(JSON.stringify('Please choose a time frame up to 31 days maximum')));
  }
  log.debug(fromDate, "to", toDate);

  if(req.params["phenomenon"] && req.params["boxid"]) {
    var generator = csvstringify({columns: ['createdAt', 'value']});
    var stringifier = csvstringify({header: 1, delimiter: ';'});

    var phenom = req.params["phenomenon"].toString();
    var boxId = req.params["boxid"].toString();
    var boxIds = boxId.split(',');

    Box.find({
      '_id': {
        '$in': boxIds
      },
      'sensors.title': req.params["phenomenon"].toString()
    })
    .lean()
    .exec(function(error,boxData){
      var sensors = {};
      for(var i=0; i<boxData.length; i++) {
        for(var j=0; j<boxData[i].sensors.length; j++){
          if(boxData[i].sensors[j].title===phenom){
            sensors[boxData[i].sensors[j]['_id']] = {};
            sensors[boxData[i].sensors[j]['_id']].lat = boxData[i].loc[0].geometry.coordinates[0];
            sensors[boxData[i].sensors[j]['_id']].lng = boxData[i].loc[0].geometry.coordinates[1];
          }
        }
      }

      var qry = Measurement.find({
        'sensor_id': {
          '$in': Object.keys(sensors)
        },
        createdAt: {
          "$gt": fromDate,
          "$lt": toDate
        }
      },{"createdAt":1, "value":1, "_id": 0, "sensor_id":1})
      .lean()
      .stream({
        transform: () => {
          return (data) => {
            data.lat = sensors[data.sensor_id].lat;
            data.lng = sensors[data.sensor_id].lng;
            delete(data.sensor_id);
            return data;
          };
        }()
      });//{ transform: JSON.stringify }

      qry
        .pipe(stringifier)
        .on('end', (data) => {
            if(data){
              res.header('Content-Type', 'text/csv');
            } else {
              res.status(404);
            }
        })
        .pipe(res);
    });

  } else {
    return next(new restify.InvalidArgumentError(JSON.stringify('Invalid parameters')));
  }
}

/**
 * @api {post} /boxes/:boxId/:sensorId Post new measurement
 * @apiDescription Posts a new measurement to a specific sensor of a box.
 * @apiVersion 0.0.1
 * @apiGroup Measurements
 * @apiName postNewMeasurement
 * @apiParam {ID} boxId SenseBox unique ID.
 * @apiParam {ID} sensorId Sensors unique ID.
 * @apiParamExample Request-Example:
 * curl --data value=22 localhost:8000/boxes/56ccb342eda956582a88e48c/56ccb342eda956582a88e490
 */
function postNewMeasurement(req, res, next) {
  Box.findOne({_id: req.params.boxId}, function(error,box){
    if (error) {
      return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
    } else {
      saveMeasurement(box, req.params.sensorId, req.params.value, req.params.createdAt).then(function(result){
        if(result){
          res.send(201, "Measurement saved in box");
        } else {
          res.send(400, "Measurement could not be saved");
        }
      })
      .catch(function (err) {
        res.send(400, "Measurement could not be saved");
      });
    }
  });
}

function saveMeasurement(box, sensorId, value, createdAt){
  for (var i = box.sensors.length - 1; i >= 0; i--) {
    if (box.sensors[i]._id.equals(sensorId)) {
      var measurementData = {
        value: value,
        _id: mongoose.Types.ObjectId(),
        sensor_id: sensorId
      };

      if (typeof createdAt !== "undefined") {
        try {
          measurementData.createdAt = new Date(createdAt);
        } catch (e) {
          return Promise.reject(e);
        }
      }

      var measurement = new Measurement(measurementData);

      box.sensors[i].lastMeasurement = measurement._id;
      var qrys = [
        box.save(),
        measurement.save()
      ];
      return Promise.all(qrys);
    }
  };
}

/**
 * @api {post} /boxes/:boxId/data Post multiple new measurements
 * @apiDescription Post multiple new measurements as an JSON array to a box.
 * @apiVersion 0.1.0
 * @apiGroup Measurements
 * @apiName postNewMeasurements
 * @apiParam {ID} boxId SenseBox unique ID.
 * @apiSampleRequest
 * [{ "sensor": "56cb7c25b66992a02fe389de", "value": "3" },{ "sensor": "56cb7c25b66992a02fe389df", "value": "2" }]
 * curl -X POST -H 'Content-type:application/json' -d "[{ \"sensor\": \"56cb7c25b66992a02fe389de\", \"value\": \"3\" },{ \"sensor\": \"56cb7c25b66992a02fe389df\", \"value\": \"2\" }]" localhost:8000/boxes/56cb7c25b66992a02fe389d9/data
 */
function postNewMeasurements(req, res, next) {
  var data = JSON.parse(req.body);
  if(data){
    Box.findOne({_id: req.params.boxId}, function(error,box){
      if (error) {
        return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
      } else {
        saveMeasurementArray(box, data, function(result){
          if(result){
            res.send(201,"Measurements saved in box");
          } else {
            res.send(400,"Measurements could not be saved");
          }
        });
      }
    });
  } else {
    res.send(400, "Invalid request");
  }
}

function saveMeasurementArray(box, arr, callback){
  var qrys = [];
  arr.forEach(function(data){
    for (var i = box.sensors.length-1; i >= 0; i--) {
      if (box.sensors[i]._id.equals(data.sensor)) {
        var measurementData = {
          value: data.value,
          _id: mongoose.Types.ObjectId(),
          sensor_id: data.sensor
        };

        var measurement = new Measurement(measurementData);

        box.sensors[i].lastMeasurement = measurement._id;
        qrys.push(box.save());
        qrys.push(measurement.save());
      }
    }
  });
  Promise.all(qrys).then(callback);
}

/**
 * @api {get} /boxes?date=:date&phenomenon=:phenomenon Get all SenseBoxes. With the optional `date` and `phenomenon` parameters you can find SenseBoxes that have submitted data around that time, +/- 2 hours, or specify two dates separated by a comma.
 * @apiName findAllBoxes
 * @apiGroup Boxes
 * @apiVersion 0.1.0
 * @apiParam {String} date A date or datetime (UTC) where a station should provide measurements. Use in combination with `phenomenon`.
 * @apiParam {String} phenomenon A sensor phenomenon (determined by sensor name) such as temperature, humidity or UV intensity. Use in combination with `date`.
 * @apiSampleRequest http://opensensemap.org:8000/boxes
 * @apiSampleRequest http://opensensemap.org:8000/boxes?date=2015-03-07T02:50Z&phenomenon=Temperatur
 * @apiSampleRequest http://opensensemap.org:8000/boxes?date=2015-03-07T02:50Z,2015-04-07T02:50Z&phenomenon=Temperatur
 */
function findAllBoxes(req, res , next){
  var activityAroundDate = (typeof req.params["date"] === 'undefined' || req.params["date"] === "") ? undefined : req.params["date"];
  var phenomenon = (typeof req.params["phenomenon"] === 'undefined' || req.params["phenomenon"] === "") ? undefined : req.params["phenomenon"];
  var fromDate,
      toDate,
      dates;

  if(activityAroundDate && (dates = activityAroundDate.split(',')) && dates.length===2 && moment(dates[0]).isBefore(dates[1])){ // moment().isBefore() will check the date's validities as well
    fromDate = moment.utc(dates[0]).toDate();
    toDate = moment.utc(dates[1]).toDate();
  } else if(moment(activityAroundDate).isValid()) {
    fromDate = moment.utc(activityAroundDate).subtract(4, 'hours').toDate();
    toDate = moment.utc(activityAroundDate).add(4, 'hours').toDate();
  }

  // prepare query & callback
  var boxQry = Box.find({}).populate('sensors.lastMeasurement');
  var boxQryCallback = function(err, boxes){
    // extend/update 'lastMeasurement' to the queried date
    var sensorQrys = [];
    if(typeof activityAroundDate !== 'undefined') {
      boxes.forEach(function(box){
        box.sensors.forEach(function(sensor){
          sensorQrys.push(
            Measurement.findOne({
              sensor_id: sensor._id,
              createdAt: {
                "$gt": fromDate,
                "$lt": toDate
              }
            }).lean().exec()
          );
        });
      });
    }

    Promise.all(sensorQrys).then(function(thatresult){
      // merge 'old' data that was queried according to the date/timestamp into the box result set
      // by replacing the "lastMeasurement" attribute's values with one fitting the query
      if(typeof activityAroundDate !== 'undefined'/* && typeof phenomenon !== 'undefined'*/) {
        var _boxes = boxes.slice();
        // TODO: too many loops
        _boxes.forEach(function(box){
          box.sensors.forEach(function(sensor){
            thatresult.forEach(function(thisresult){
              if(thisresult !== null){
                if(sensor.lastMeasurement){
                  if(thisresult.sensor_id.toString() == sensor._id.toString()) {
                    sensor.lastMeasurement = thisresult;
                  }
                }
              }
            });
          });
        });
        return(_boxes);
      }
      return(boxes);
    }).then(function(resultset){
      if (req.params[1] === "json" || typeof req.params[1] === 'undefined') {
        res.send(resultset);
      } else if (req.params[1] === "geojson") {
        tmp = JSON.stringify(resultset);
        tmp = JSON.parse(tmp);
        var geojson = _.transform(tmp, function(result, n) {
          lat = n.loc[0].geometry.coordinates[1];
          lng = n.loc[0].geometry.coordinates[0];
          delete n["loc"];
          n["lat"] = lat;
          n["lng"] = lng;
          return result.push(n);
        });
        res.send(GeoJSON.parse(geojson, {Point: ['lat','lng']}));
      }

    });
  };

  // if date and phenom. are specified then filter boxes,
  // otherwise show all boxes
  if(typeof activityAroundDate !== 'undefined') {
    Measurement.find({
      createdAt: {
        "$gt": fromDate,
        "$lt": toDate
      }
    }).lean().distinct('sensor_id', function(err,measurements){
      var qry = {
        "sensors._id": {
          "$in": measurements
        }
      };
      if(typeof phenomenon !== 'undefined'){
        qry = {
          "sensors._id": {
            "$in": measurements
          },
          "sensors.title": phenomenon
        };
      }
      boxQry = Box.find(qry).populate('sensors.lastMeasurement');
      boxQry.exec(boxQryCallback);
    });
  } else {
    boxQry.exec(boxQryCallback);
  }
}

/**
 * @api {get} /boxes/:boxId Get one SenseBox
 * @apiName findBox
 * @apiVersion 0.0.1
 * @apiGroup Boxes
 * @apiParam {ID} boxId SenseBox unique ID.
 * @apiSuccess {String} _id SenseBox unique ID.
 * @apiSuccess {String} boxType SenseBox type (fixed or mobile).
 * @apiSuccess {Array} sensors All attached sensors.
 * @apiSuccess {Array} loc Location of SenseBox.
 * @apiSuccessExample Example data on success:
 * {
  "_id": "5386e44d5f08822009b8b614",
  "name": "PHOBOS",
  "boxType": "fixed",
  "sensors": [
    {
      "_id": "5386e44d5f08822009b8b615",
      "boxes_id": "5386e44d5f08822009b8b614",
      "lastMeasurement": {
        "_id": "5388d07f5f08822009b937b7",
        "createdAt": "2014-05-30T18:39:59.353Z",
        "updatedAt": "2014-05-30T18:39:59.353Z",
        "value": "584",
        "sensor_id": "5386e44d5f08822009b8b615",
      },
      "sensorType": "GL5528",
      "title": "Helligkeit",
      "unit": "Pegel"
    }
  ],
  "loc": [
    {
      "_id": "5386e44d5f08822009b8b61a",
      "geometry": {
        "coordinates": [
          10.54555893642828,
          49.61361673283691
        ],
        "type": "Point"
      },
      "type": "feature"
    }
  ]
}
 */
function findBox(req, res, next) {
  var id = req.params['boxId'].toString();
  var format = (req.params['format'] && req.params['format'] !== '') ? req.params['format'].toString() : "json";
  if (isEmptyObject(req.query) && mongoose.Types.ObjectId.isValid(id)) {
    Box.findOne({_id: id}).exec(function(error,box){
      if (error) return next(new restify.InvalidArgumentError());
      if (box) {
        box.populate('sensors.lastMeasurement');
        if (format === "json" || typeof format === 'undefined') {
          res.send(box);
        } else if (format === "geojson") {
          tmp = JSON.stringify(box);
          tmp = JSON.parse(tmp);
          lat = tmp.loc[0].geometry.coordinates[1];
          lng = tmp.loc[0].geometry.coordinates[0];
          delete tmp["loc"];
          tmp["lat"] = lat;
          tmp["lng"] = lng;
          geojson = [tmp];
          res.send(GeoJSON.parse(geojson, {Point: ['lat','lng']}));
        }
      } else {
        res.send(404, "No senseBox found");
      }
    });
  } else{
    res.send(404, "No senseBox found");
  }
}

function createNewUser (req) {
  var userData = {
    firstname: req.params.user.firstname,
    lastname: req.params.user.lastname,
    email: req.params.user.email,
    apikey: req.params.orderID,
    boxes: []
  }

  var user = new User(userData);

  return user;
}

function createNewBox (req) {
  var boxData = {
    name: req.params.name,
    boxType: req.params.boxType,
    loc: req.params.loc,
    grouptag: req.params.tag,
    exposure: req.params.exposure,
    _id: mongoose.Types.ObjectId(),
    model: req.params.model,
    sensors: []
  };

  var box = new Box(boxData);

  if (req.params.model) {
    switch(req.params.model){
      case 'homeEthernet':
        req.params.sensors = products.senseboxhome;
        break;
      case 'homeWifi':
        req.params.sensors = products.senseboxhome;
        break;
      case 'basicEthernet':
        req.params.sensors = products.senseboxbasic;
        break;
      default:
        break;
    }
  }

  for (var i = req.params.sensors.length - 1; i >= 0; i--) {
    var id = mongoose.Types.ObjectId();

    var sensorData = {
      _id: id,
      title: req.params.sensors[i].title,
      unit: req.params.sensors[i].unit,
      sensorType: req.params.sensors[i].sensorType,
    };

    box.sensors.push(sensorData);
  };

  return box;
}

/**
 * @api {post} /boxes Post new SenseBox
 * @apiDescription Create a new SenseBox.
 * @apiVersion 0.0.1
 * @apiGroup Boxes
 * @apiName postNewBox
 */
function postNewBox(req, res, next) {
  User.findOne({apikey:req.params.orderID}, function (err, user) {
    if (err) {
      log.error(err);
      return res.send(400, "An error occured");
    } else {

      log.debug("A new sensebox is being submitted");
      if (!user) {
        var newUser = createNewUser(req);
        var newBox = createNewBox(req);
        var savedBox = {};

        newUser._doc.boxes.push(newBox._doc._id.toString());
        newBox.save( function (err, box) {
          if (err) {
            return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
          }

          try {
            genScript(box, box.model);
            savedBox = box;

            newUser.save( function (err, user) {
              if (err) {
                return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
              } else {
                if(cfg.email_host!==''){
                  sendWelcomeMail(user, newBox);
                  sendYeahMail(user, newBox);
                  _postToSlack("Eine neue <https://opensensemap.org/explore/" + newBox._id + "|senseBox> wurde registriert");
                }
                return res.send(201, user);
              }
            });

          } catch (e) {
            log.error(e);
            return res.send(400, "An error occured");
          }
        });
      }
    }
  });
  next();
}

// generate Arduino script
function genScript(box, model) {
  var output = cfg.targetFolder+""+box._id+".ino";
  try { if(fs.statSync(output)){ fs.unlinkSync(output); } } catch(e){}
  switch(model){
    case 'homeEthernet':
      filename = "files/template_home/template_home.ino";
      break;
    case 'basicEthernet':
      filename = "files/template_basic/template_basic.ino";
      break;
    case 'homeWifi':
      filename = "files/template_home_wifi/template_home_wifi.ino";
      break;
    default:
      filename = "files/template_custom_setup/template_custom_setup.ino";
      break;
  }
  fs.readFileSync(filename).toString().split('\n').forEach(function (line) {
    if (line.indexOf("//SenseBox ID") != -1) {
      fs.appendFileSync(output, line.toString() + "\n");
      fs.appendFileSync(output, '#define SENSEBOX_ID "'+box._id+'"\n');
    } else if (line.indexOf("//Sensor IDs") != -1) {
      fs.appendFileSync(output, line.toString() + "\n");
      var customSensorindex = 1;
      for (var i = box.sensors.length - 1; i >= 0; i--) {
        var sensor = box.sensors[i];
        log.debug(sensor);
        if (sensor.title == "Temperatur") {
          fs.appendFileSync(output, '#define TEMPSENSOR_ID "'+sensor._id+'"\n');
        } else if(sensor.title == "rel. Luftfeuchte") {
          fs.appendFileSync(output, '#define HUMISENSOR_ID "'+sensor._id+'"\n');
        } else if(sensor.title == "Luftdruck") {
          fs.appendFileSync(output, '#define PRESSURESENSOR_ID "'+sensor._id+'"\n');
        } else if(sensor.title == "Lautstärke") {
          fs.appendFileSync(output, '#define NOISESENSOR_ID "'+sensor._id+'"\n');
        } else if(sensor.title == "Helligkeit") {
          fs.appendFileSync(output, '#define LIGHTSENSOR_ID "'+sensor._id+'"\n');
        } else if (sensor.title == "Beleuchtungsstärke") {
          fs.appendFileSync(output, '#define LUXSENSOR_ID "'+sensor._id+'"\n');
        } else if (sensor.title == "UV-Intensität") {
          fs.appendFileSync(output, '#define UVSENSOR_ID "'+sensor._id+'"\n');
        } else {
          fs.appendFileSync(output, '#define SENSOR'+customSensorindex+'_ID "'+sensor._id+'" \/\/ '+sensor.title+' \n');
          customSensorindex++;
        }
      }
    } else {
      fs.appendFileSync(output, line.toString() + "\n");
    }
  });
}

/**
 * @api {get} /boxes/:boxId/script Download the Arduino script for your senseBox
 * @apiName getScript
 * @apiGroup Boxes
 * @apiVersion 0.1.0
 */
function getScript(req, res, next) {
  User.findOne({apikey:req.headers["x-apikey"]}, function (error, user) {
    if (error) {
      res.send(400, "ApiKey does not exist");
    }
    if (user.boxes.indexOf(req.params.boxId) !== -1) {
      Box.findById(req.params.boxId, function (err, box) {
        if (error) {
          res.send(400, "No such box");
        }

        var script = fs.readFileSync(cfg.targetFolder+""+box._id+".ino", encoding = 'utf8');
        return res.send(200, script);
      });
    }
  });
}

/**
 * @api {delete} /boxes/:boxId Delete a senseBox and its measurements
 * @apiName deleteBox
 * @apiGroup Boxes
 * @apiVersion 0.1.0
 */
function deleteBox(req, res, next) {
  User.findOne({apikey:req.headers["x-apikey"]}, function (findusererror, user) {
    if (findusererror) {
      res.send(400, "ApiKey does not exist");
    }
    if (user.boxes.indexOf(req.params.boxId) !== -1) {
      qrys = [];

      Box.findById(req.params.boxId, function (findboxerr, box) {
        box.sensors.forEach(function(sensor){
          qrys.push(Measurement.find({ sensor_id: sensor._id }).remove());
        });
        qrys.push(box.remove());
        qrys.push(user.remove());
      });

      Promise.all(qrys).then(function(thatresult){
      }).then(function(){
        res.send(200, "Box deleted");
      });
    }
  });
}

/**
 * @api {get} /boxes/stats Get some statistics about the database
 * @apiName getStatistics
 * @apiGroup misc
 * @apiVersion 0.1.0
 * @apiSuccessExample {json} [8,13] // 8 boxes, 13 measurements in the database
 */
function getStatistics(req, res, next){
  var qrys = [
    Box.count({}),
    Measurement.count({})
  ];
  Promise.all(qrys).then(function(results){
    res.send(200, results);
  });
}

// Send box script to user via email
function sendWelcomeMail(user, box) {
  var templatePath = './templates/registration.html';
  var templateContent = fs.readFileSync(templatePath, encoding = 'utf8');
  var template = _.template(templateContent);
  var compiled = template({ 'user': user, 'box': box });

  var transporter = nodemailer.createTransport(smtpTransport({
    host: cfg.email_host,
    port: cfg.email_port,
    secure: cfg.email_secure,
    auth: {
        user: cfg.email_user,
        pass: cfg.email_pass
    }
  }));
  transporter.use('compile', htmlToText());
  transporter.sendMail({
    from: {
      name: cfg.email_fromName,
      address: cfg.email_fromEmail
    },
    replyTo: {
      name: cfg.email_fromName,
      address: cfg.email_replyTo
    },
    to: {
      name: user.firstname+" "+user.lastname,
      address: user.email
    },
    subject: cfg.email_subject,
    template: 'registration',
    html: compiled,
    attachments: [
      {
        filename: "sensebox.ino",
        path: cfg.targetFolder + box._id + ".ino"
      }
    ]
  }, function(err, info){
    if(err){
      log.error("Email error");
      log.error(err);
    }
    if(info){
      log.debug("Email sent successfully");
    }
  });
}

// Send Yeah Mail to senseBox Team
function sendYeahMail(user, box) {
  var templatePath = './templates/yeah.html';
  var templateContent = fs.readFileSync(templatePath, encoding = 'utf8');
  var template = _.template(templateContent);
  var compiled = template({ 'user': user, 'box': box });

  var transporter = nodemailer.createTransport(smtpTransport({
    host: cfg.email_host,
    port: cfg.email_port,
    secure: cfg.email_secure,
    auth: {
        user: cfg.email_user,
        pass: cfg.email_pass
    }
  }));
  transporter.use('compile', htmlToText());
  transporter.sendMail({
    from: {
      name: cfg.email_fromName,
      address: cfg.email_fromEmail
    },
    replyTo: {
      name: cfg.email_fromName,
      address: cfg.email_replyTo
    },
    to: {
      name: user.firstname+" "+user.lastname,
      address: "support@sensebox.de"
    },
    subject: cfg.email_subject,
    template: 'yeah',
    html: compiled

  }, function(err, info){
    if(err){
      log.error("Email error");
      log.error(err);
    }
    if(info){
      log.debug("Email sent successfully");
    }
  });
}

function _postToSlack (text) {
  if (cfg.slack_url) {
    request.post({ url: cfg.slack_url, json: { text: text }});
  }
}

function isEmptyObject(obj) {
  return !Object.keys(obj).length;
}

server.listen(cfg.port, function () {
  console.log('%s listening at %s', server.name, server.url);
});

server.on('uncaughtException', function (req, res, route, err) {
  _postToSlack("Error in API (" + route.spec.method + " " + route.spec.path + "): " + err);
  log.error('Uncaught error', err);
  console.log(err.stack);
  return res.send(500, "An error occured");
});
