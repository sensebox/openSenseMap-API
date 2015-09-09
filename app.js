var restify = require('restify'),
  mongoose = require('mongoose'),
  timestamp = require('mongoose-timestamp'),
  fs = require('fs'),
  GeoJSON = require('geojson'),
  _ = require('lodash'),
  products = require('./products'),
  cfg = require('./config'),
  json2csv = require('json2csv'),
  Stream = require('stream'),
  nodemailer = require('nodemailer'),
  smtpTransport = require('nodemailer-smtp-transport'),
  htmlToText = require('nodemailer-html-to-text').htmlToText;

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
      { path: './request.log', type: 'rotating-file', period: '1w', count: 8 },
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
      { level: 'error', path: './request-error.log', type: 'rotating-file', period: '1w', count: 8 },
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

conn = mongoose.connect("mongodb://localhost/OSeM-api",{
  keepAlive: 1,
  user: cfg.dbuser,
  pass: cfg.dbuserpass
});

var Schema = mongoose.Schema,
  ObjectId = Schema.ObjectID;

//Location schema
var LocationSchema = new Schema({
  type: {
    type: String,
    required: true,
    default: "Feature"
  },
  geometry: {
    type: {
      type: String,
      required: true,
      default:"Point"
    },
    coordinates: {
      type: Array,
      required: true
    }
  },
  properties: Schema.Types.Mixed
});

LocationSchema.index({ 'geometry' : '2dsphere' });

var measurementSchema = new Schema({
  value: {
    type: String,
    required: true
  },
  sensor_id: {
    type: Schema.Types.ObjectId,
    ref: 'Sensor',
    required: true
  }
});

measurementSchema.plugin(timestamp);

//Sensor schema
var sensorSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  sensorType: {
    type: String,
    required: false,
    trim: true
  },
  lastMeasurement: {
    type: Schema.Types.ObjectId,
    ref: 'Measurement'
  }
});

//SenseBox schema
var boxSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  loc: {
    type: [LocationSchema],
    required: true
  },
  boxType: {
    type: String,
    required: true
  },
  exposure: {
    type: String,
    required: false
  },
  grouptag: {
    type: String,
    required: false
  },
  model: {
    type: String,
    required: false
  },
  sensors: [sensorSchema]
},{ strict: false });

var userSchema = new Schema({
  firstname: {
    type: String,
    required: true,
    trim: true
  },
  lastname: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  apikey: {
    type: String,
    trim: true
  },
  boxes: [
    {
      type: String,
      trim: true
    }
  ]
});

var Measurement = mongoose.model('Measurement', measurementSchema);
var Box = mongoose.model('Box', boxSchema);
var Sensor = mongoose.model('Sensor', sensorSchema);
var User = mongoose.model('User', userSchema);

var PATH = '/boxes';
var userPATH = 'users';

server.pre(function (request,response,next) {
  request.log.info({req: request}, 'REQUEST');
  next();
});

server.get({path : PATH , version : '0.0.1'} , findAllBoxes);
server.get({path : /(boxes)\.([a-z]+)/, version : '0.0.1'} , findAllBoxes);
server.get({path : PATH +'/:boxId' , version : '0.0.1'} , findBox);
server.get({path : PATH +'/:boxId/sensors', version : '0.0.1'}, getMeasurements);
server.get({path : PATH +'/:boxId/data/:sensorId', version : '0.0.1'}, getData);

server.post({path : PATH , version: '0.0.1'} ,postNewBox);
server.post({path : PATH +'/:boxId/:sensorId' , version : '0.0.1'}, postNewMeasurement);

server.put({path: PATH + '/:boxId' , version: '0.0.1'} , updateBox);

server.get({path : userPATH +'/:boxId', version : '0.0.1'}, validApiKey);

function unknownMethodHandler(req, res) {
  if (req.method.toLowerCase() === 'options') {
    var allowHeaders = ['Accept', 'X-ApiKey', 'Accept-Version', 'Content-Type', 'Api-Version', 'Origin', 'X-Requested-With']; // added Origin & X-Requested-With

    if (res.methods.indexOf('OPTIONS') === -1) res.methods.push('OPTIONS');

    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Headers', allowHeaders.join(', '));
    res.header('Access-Control-Allow-Methods', res.methods.join(', '));
    res.header('Access-Control-Allow-Origin', req.headers.origin);

    return res.send(204);
  }
  else
    return res.send(new restify.MethodNotAllowedError());
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
 * @apiName updateBox
 */
function validApiKey (req,res,next) {
  User.findOne({apikey:req.headers['x-apikey']}, function (error, user) {
    if (error) {
      res.send(400, 'ApiKey not existing!');
    }

    if (user.boxes.indexOf(req.params.boxId) != -1) {
      res.send(200,'ApiKey is valid!');
    } else {
      res.send(400,'ApiKey is invalid!');
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
 * @api {put} /boxes/:boxId Update a SenseBox
 * @apiDescription Modify the specified SenseBox.
 * @apiParam {ID} boxId SenseBox unique ID.
 * @apiHeader {ObjectId} x-apikey SenseBox specific apikey
 * @apiHeaderExample {json} Request-Example:
 *   {
 *     'X-ApiKey':54d3a96d5438b4440913434b
 *   }
 * @apiVersion 0.0.1
 * @apiGroup Boxes
 * @apiName updateBox
 */
function updateBox(req, res, next) {
  User.findOne({apikey:req.headers["x-apikey"]}, function (error, user) {
    if (error) {
      res.send(400, 'ApiKey not existing!');
    }
    if (user.boxes.indexOf(req.params.boxId) !== -1) {
      Box.findById(req.params.boxId, function (err, box) {
        if (err) return handleError(err);
        log.debug(req.params);
        if (req.params.tmpSensorName !== undefined) {
          box.set({name: req.params.tmpSensorName});
        }
        if (req.params.image !== undefined) {
          var data = req.params.image.toString();
          var imageBuffer = decodeBase64Image(data);
          fs.writeFile(cfg.imageFolder+""+req.params.boxId+'.jpeg', imageBuffer.data, function(err){
            if (err) return new Error(err);
            box.set({image:req.params.boxId+'.jpeg'});
            box.save(function (err) {
              if (err) return handleError(err);
              res.send(box);
            });
          });
        } else {
          box.set({image:""});
        }
        box.save(function (err) {
          if (err) return handleError(err);
          res.send(box);
        });
      });
    } else {
     res.send(400, 'ApiKey does not match SenseBoxID');
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
      res.send(201,sensors);
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
  // default to now
  var toDate = (typeof req.params["to-date"] == 'undefined' || req.params["to-date"] == "") ? new Date() : new Date(req.params["to-date"]);
  // default to 24 hours earlier
  var fromDate = (typeof req.params["from-date"] == 'undefined' || req.params["from-date"] == "") ? new Date(toDate.valueOf() - 1000*60*60*24*15) : new Date(req.params["from-date"]);
  var format = (typeof req.params["format"] == 'undefined') ? "json" : req.params["format"].toLowerCase();

  log.debug(fromDate, "to", toDate);

  if (toDate.valueOf() < fromDate.valueOf()) {
    return next(new restify.InvalidArgumentError(JSON.stringify('Invalid time frame specified')));
  }
  if (toDate.valueOf()-fromDate.valueOf() > 1000*60*60*24*32) {
    return next(new restify.InvalidArgumentError(JSON.stringify('Please choose a time frame up to 31 days maximum')));
  }

  var queryLimit = 100000;
  var resultLimit = 1000;

  Measurement.find({ 
      sensor_id: req.params.sensorId,
      createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) }
    },{"createdAt":1, "value":1, "_id": 0}) // do not send _id column
  .limit(queryLimit)
  .lean()
  .exec(function(error,sensorData){
    if (error) {
      return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
    } else {
      // only return every nth element
      // TODO: equally distribute data over time instead
      if(sensorData.length > resultLimit) {
        var limitedResult = [];
        var returnEveryN = Math.ceil(sensorData.length/resultLimit);
        log.info("returnEveryN ", returnEveryN);
        log.info("old sensorData length:", sensorData.length);
        for(var i=0; i<sensorData.length; i++) {
          if(i%returnEveryN == 0) {
            limitedResult.push( sensorData[i] )
          } 
        }
        sensorData = limitedResult;
        log.info("new sensorData length:", sensorData.length);
      }
      
      if(typeof req.params["download"] != 'undefined' && req.params["download"]=="true"){
        // offer download to browser
        res.header('Content-Disposition', 'attachment; filename='+req.params.sensorId+'.'+format);
      }

      if(format == "csv") { 
        // send CSV
        json2csv({data: sensorData, fields: ['createdAt', 'value']}, function(err, csv) {
          if (err) log.error(err);
          res.header('Content-Type', 'text/csv');
          res.header('Content-Disposition', 'attachment; filename='+req.params.sensorId+'.csv');
          res.send(201, csv);
        });
      } else { 
        // send JSON
        res.send(201,sensorData);
      }

    }
  });
}


/**
 * @api {post} /boxes/:boxId/:sensorId Post new measurement
 * @apiDescription Posts a new measurement to a specific sensor of a box.
 * @apiVersion 0.0.1
 * @apiGroup Measurements
 * @apiName postNewMeasurement
 * @apiParam {ID} boxId SenseBox unique ID.
 * @apiParam {ID} sensorId Sensors unique ID.
 */
function postNewMeasurement(req, res, next) {
  Box.findOne({_id: req.params.boxId}, function(error,box){
    if (error) {
      return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
    } else {
      for (var i = box.sensors.length - 1; i >= 0; i--) {
        if (box.sensors[i]._id.equals(req.params.sensorId)) {

          var measurementData = {
            value: req.params.value,
            _id: mongoose.Types.ObjectId(),
            sensor_id: req.params.sensorId
          };

          var measurement = new Measurement(measurementData);

          box.sensors[i].lastMeasurement = measurement._id;
          box.save(function(error,data){
            if (error) {
              return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
            } else {
              res.send(201,'measurement saved in box');
            }
          });

          measurement.save(function(error, data, box){
            if (error) {
              return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
            } else {
              res.send(201,measurement);
            }
          });
        }
      };
    }
  });
}

/**
 * @api {get} /boxes Get all SenseBoxes
 * @apiName findAllBoxes
 * @apiGroup Boxes
 * @apiVersion 0.0.1
 * @apiSampleRequest http://opensensemap.org:8000/boxes
 */
function findAllBoxes(req, res , next){
  Box.find({}).populate('sensors.lastMeasurement').exec(function(err,boxes){
    if (req.params[1] === "json" || req.params[1] === undefined) {
      res.send(boxes);
    } else if (req.params[1] === "geojson") {
      tmp = JSON.stringify(boxes);
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
  id = req.params.boxId.split(".")[0];
  format = req.params.boxId.split(".")[1];
  if (isEmptyObject(req.query)) {
    Box.findOne({_id: id}).populate('sensors.lastMeasurement').exec(function(error,box){
      if (error) return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
      if (box) {
        if (format === "json" || format === undefined) {
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
        res.send(404);
      }
    });
  } else{
    res.send(box);
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
    sensors: []
  };

  var box = new Box(boxData);

  if (req.params.model) {
    switch(req.params.model){
      case 'homeEthernet':
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
      return res.send(500);
    } else {

      log.debug("A new sensebox is being submitted");
      //log.debug(req.params);
      if (!user) {
        var newUser = createNewUser(req);
        var newBox = createNewBox(req);
        var savedBox = {};

        newUser._doc.boxes.push(newBox._doc._id.toString());
        newBox.save( function (err, box) {
          if (err) {
            return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
          }

          switch(req.params.model){
            case 'homeEthernet':
              filename = "files/template_home/template_home.ino";
              break;
            case 'basicEthernet':
              filename = "files/template_basic/template_basic.ino";
              break;
            default:
              filename = "files/template_custom_setup/template_custom_setup.ino";
              break;
          }

          try {
            var output = cfg.targetFolder+""+box._id+".ino";
            log.debug(output);
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
                  } else if (sensor.title == "UV-Index") {
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
            savedBox = box;

            newUser.save( function (err, user) {
              if (err) {
                return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
              } else {
                sendWelcomeMail(user, newBox);
                return res.send(201, user);
              }
            });

          } catch (e) {
            log.error(e);
            return res.send(500, JSON.stringify('An error occured'));
          }

          
        });
      }
    }
  });
  next();
}

// Send box script to user via email
function sendWelcomeMail(user, box) {
  var templatePath = './templates/registration.html';
  var templateContent = fs.readFileSync(templatePath, encoding = 'utf8');
  var template = _.template(templateContent);
  var compiled = template({ 'user': user, 'box': box });

  var transporter = nodemailer.createTransport(smtpTransport({
    host: cfg.email.host,
    port: cfg.email.port,
    secure: cfg.email.secure,
    auth: {
        user: cfg.email.user,
        pass: cfg.email.pass
    }
  }));
  transporter.use('compile', htmlToText());
  transporter.sendMail({
    from: { 
      name: cfg.email.fromName, 
      address: cfg.email.fromEmail
    },
    replyTo: {
      name: cfg.email.fromName, 
      address: cfg.email.replyTo
    },
    to: { 
      name: user.firstname+" "+user.lastname, 
      address: user.email
    },
    subject: cfg.email.subject,
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
      log.error("Email error")
      log.error(err)
    }
    if(info){
      log.debug("Email sent successfully")
    }
  });
}

function isEmptyObject(obj) {
  return !Object.keys(obj).length;
}

server.listen(8000, function () {
  console.log('%s listening at %s', server.name, server.url);
});

server.on('uncaughtException', function (req, res, route, err) {
  log.error('Uncaught error', err);
  return res.send(500, JSON.stringify('An error occured'));
});