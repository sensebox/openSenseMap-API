var restify = require('restify'),
  mongoose = require('mongoose'),
  timestamp = require('mongoose-timestamp'),
  fs = require('fs');


var server = restify.createServer({ name: 'opensensemap-api' });
server.use(restify.fullResponse());
server.use(restify.queryParser());
server.use(restify.bodyParser());

// conn = mongoose.connect("mongodb://localhost/opensensemap-api");
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
  orderID: {
    type: String,
    required: false,
    trim: true
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

server.get({path : userPATH +'/:boxId', version : '0.0.1'}, validApiKey);
server.post({path : userPATH , version : '0.0.1'} , generateNewID);

function validApiKey (req,res,next) {
  User.findOne({apikey:req.headers['x-apikey']}, function (error, user) {
    if (error) {
      return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
    }

    if (user.boxes.indexOf(req.params.boxId) != -1) {
      res.status(200);
      res.send('ApiKey is valid!');
    } else {
      res.status(400);
      res.send('ApiKey is invalid!');
    }
  });
}

function generateNewID(req, res, next) {

  var userData = {
    firstname: req.params.firstname,
    lastname: req.params.lastname,
    email: req.params.email,
    apikey: mongoose.Types.ObjectId(),
    boxes: []
  }

  var user = new User(userData);

  user.save(function(error,user){
    if (error) {
      return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
    } else {
      res.send(201,user);
    }
  });

}

function getMeasurements(req, res, next) {
  Box.findOne({_id: req.params.boxId},{sensors:1}).populate('sensors.lastMeasurement').exec(function(error,sensors){
    if (error) {
      return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
    } else {
      // console.log(sensors);
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

function postNewBox(req, res, next) {
  if (req.params.name === undefined) {
    return next(new restify.InvalidArgumentError('Name must be supplied'));
  }

  User.findOne({apikey:req.params.orderID}, function(error, user){
    if (error) return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));

    if (user) {
      var boxData = {
        name: req.params.name,
        boxType: req.params.boxType,
        loc: req.params.loc,
        _id: mongoose.Types.ObjectId(),
        sensors: []
      };

      var box = new Box(boxData);

      user.boxes.push(boxData._id);
      user.save();

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

      box.save(function(error,data){
        if (error) {
          return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
        } else {
          fs.readFileSync('files/template.ino').toString().split('\n').forEach(function (line) {
            var filename = "files/"+data._id+".ino";
            if (line.indexOf("//SenseBox ID") != -1) {
              fs.appendFileSync(filename, line.toString() + "\n");
              fs.appendFileSync(filename, '#define SENSEBOX_ID "'+data._id+'";\n');
            } else if (line.indexOf("//Sensor IDs") != -1) {
              fs.appendFileSync(filename, line.toString() + "\n");
              for (var i = data.sensors.length - 1; i >= 0; i--) {
                var sensor = data.sensors[i];
                if (sensor.title == "Temperatur") {
                  fs.appendFileSync(filename, '#define TEMPERATURESENSOR_ID "'+sensor._id+'";\n');
                } else if(sensor.title == "Luftfeuchtigkeit") {
                  fs.appendFileSync(filename, '#define HUMIDITYSENSOR_ID "'+sensor._id+'";\n');
                } else if(sensor.title == "Luftdruck") {
                  fs.appendFileSync(filename, '#define PRESSURESENSOR_ID "'+sensor._id+'";\n');
                } else if(sensor.title == "Schall") {
                  fs.appendFileSync(filename, '#define NOISESENSOR_ID "'+sensor._id+'";\n');
                } else if(sensor.title == "Helligkeit") {
                  fs.appendFileSync(filename, '#define LIGHTSENSOR_ID "'+sensor._id+'";\n');
                } else if (sensor.title == "UV") {
                  fs.appendFileSync(filename, '#define UVSENSOR_ID "'+sensor._id+'";\n');
                };
              };
            } else {
              fs.appendFileSync(filename, line.toString() + "\n");
            }
          });
          res.send(201,data);
        }
      });
    } else {
      res.send(404, 'SenseBox ID invalid')
    };
  })
}

function isEmptyObject(obj) {
  return !Object.keys(obj).length;
}

server.listen(8000, function () {
    console.log('%s listening at %s', server.name, server.url);
});