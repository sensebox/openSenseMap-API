var restify = require('restify'),
  mongoose = require('mongoose'),
  timestamp = require('mongoose-timestamp'),
  fs = require('fs');


var server = restify.createServer({ name: 'opensensemap-api' });
server.use(restify.CORS({'origins': ['http://localhost', 'https://opensensemap.org']}));
server.use(restify.fullResponse());
server.use(restify.queryParser());
server.use(restify.bodyParser());

conn = mongoose.connect("mongodb://localhost/OSeM-api");
var Schema = mongoose.Schema,
  ObjectId = Schema.ObjectID;

//Location schema
var LocationSchema = new Schema({
  type: {
    type: String,
    required: true,
    default: "feature"
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
  sensors: [sensorSchema]
});

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

server.get({path : PATH , version : '0.0.1'} , findAllBoxes);
server.get({path : PATH +'/:boxId' , version : '0.0.1'} , findBox);
server.get({path : PATH +'/:boxId/sensors', version : '0.0.1'}, getMeasurements);

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

function updateBox(req, res, next) {

}

function getMeasurements(req, res, next) {
  Box.findOne({_id: req.params.boxId},{sensors:1}).populate('sensors.lastMeasurement').exec(function(error,sensors){
    if (error) {
      return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
    } else {
      res.send(201,sensors);
    }
  });
}

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

function findAllBoxes(req, res , next){
  Box.find({}).populate('sensors.lastMeasurement').exec(function(err,boxes){
    res.send(boxes);
  });
}

function findBox(req, res, next) {
  if (isEmptyObject(req.query)) {
    Box.findOne({_id: req.params.boxId}).populate('sensors.lastMeasurement').exec(function(error,box){
      if (error) return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
      if (box) {
        res.send(box);
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
    firstname: req.params.firstname,
    lastname: req.params.lastname,
    email: req.params.email,
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

function postNewBox(req, res, next) {
  User.findOne({apikey:req.params.orderID}, function (err, user) {
    if (!user) {
      var newUser = createNewUser(req);
      var newBox = createNewBox(req);

      newUser._doc.boxes.push(newBox._doc._id.toString());
      newUser.save( function (err, user) {
        if (err) {
          return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
        }

        newBox.save( function (err, box) {
          if (err) {
            return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
          }

          fs.readFileSync('files/template.ino').toString().split('\n').forEach(function (line) {
            var filename = "files/"+box._id+".ino";
            if (line.indexOf("//SenseBox ID") != -1) {
              fs.appendFileSync(filename, line.toString() + "\n");
              fs.appendFileSync(filename, '#define SENSEBOX_ID "'+box._id+'"\n');
            } else if (line.indexOf("//Sensor IDs") != -1) {
              fs.appendFileSync(filename, line.toString() + "\n");
              for (var i = box.sensors.length - 1; i >= 0; i--) {
                var sensor = box.sensors[i];
                if (sensor.title == "Temperatur") {
                  fs.appendFileSync(filename, '#define TEMPERATURESENSOR_ID "'+sensor._id+'"\n');
                } else if(sensor.title == "Luftfeuchtigkeit") {
                  fs.appendFileSync(filename, '#define HUMIDITYSENSOR_ID "'+sensor._id+'"\n');
                } else if(sensor.title == "Luftdruck") {
                  fs.appendFileSync(filename, '#define PRESSURESENSOR_ID "'+sensor._id+'"\n');
                } else if(sensor.title == "Schall") {
                  fs.appendFileSync(filename, '#define NOISESENSOR_ID "'+sensor._id+'"\n');
                } else if(sensor.title == "Helligkeit") {
                  fs.appendFileSync(filename, '#define LIGHTSENSOR_ID "'+sensor._id+'"\n');
                } else if (sensor.title == "UV") {
                  fs.appendFileSync(filename, '#define UVSENSOR_ID "'+sensor._id+'"\n');
                };
              };
            } else {
              fs.appendFileSync(filename, line.toString() + "\n");
            }
          });

          res.send(201, box);
        });
      });
    }
  });
}

function isEmptyObject(obj) {
  return !Object.keys(obj).length;
}

server.listen(8000, function () {
    console.log('%s listening at %s', server.name, server.url);
});