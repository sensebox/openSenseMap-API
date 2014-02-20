var restify = require('restify'), 
	mongoose = require('mongoose'),
  timestamp = require('mongoose-timestamp');


var server = restify.createServer({ name: 'opensensemap-api' })
	server.listen(7000, function () {
 		console.log('%s listening at %s', server.name, server.url);
});

server
	.use(restify.fullResponse())
 	.use(restify.bodyParser());

conn = mongoose.connect("mongodb://localhost/opensensemap-api");
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
  boxes_id: {
    type: Schema.Types.ObjectId,
    ref: 'Box',
    required: true 
  },
  measurements: {type: Schema.Types.ObjectId,ref: 'Measurement'}
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
 	sensors: [{type: Schema.Types.ObjectId, ref: 'Sensor'}]
});

var Measurement = mongoose.model('Measurement', measurementSchema);
var Box = mongoose.model('Box', boxSchema);
var Sensor = mongoose.model('Sensor', sensorSchema);

var PATH = '/boxes'
server.get({path : PATH , version : '0.0.1'} , findAllBoxes);
server.get({path : PATH +'/:boxId' , version : '0.0.1'} , findBox);
server.post({path : PATH , version: '0.0.1'} ,postNewBox);
server.post({path : PATH +'/:boxId/:sensorId' , version : '0.0.1'}, postNewMeasurement);

function postNewMeasurement(req, res, next) {
  if (Box.findOne({_id: req.params.boxId})) {
    if (Sensor.findOne({_id: req.params.sensorId})) {
      var measurementData = {
        value: req.params.value,
        _id: mongoose.Types.ObjectId(),
        sensor_id: req.params.sensorId
      };

      var measurement = new Measurement(measurementData);

      measurement.save(function(error, data){
        if (error) {
          return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
        } else {
          Sensor.update({_id:req.params.sensorId},{$set: {measurements:measurement._id}}, function(err,sensor){

          });
          res.json(data);
          res.send(201,measurement); 
        }
      });
    } else {
      res.send(404, 'SensorID invalid!');
    };
  } else {
    res.send(404, 'BoxID invalid');
  }
}

function findAllBoxes(req, res , next){
	Box.find({}).populate('sensors').exec(function(err,boxes){
    res.send(boxes);
  });
}

function findBox(req, res, next) {
  Box.findOne({_id: req.params.boxId}).populate('sensors measurements').exec(function(error,box){
    if (error) return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
    if (box) {
      res.send(box);
    } else {
      res.send(404);
    };
  });
}

function postNewBox(req, res, next) {
	if (req.params.name === undefined) {
  		return next(new restify.InvalidArgumentError('Name must be supplied'));
 	};

  var boxData = {
    name: req.params.name,
    loc: req.params.loc,
    _id: mongoose.Types.ObjectId(),
    sensors: []
  };

  var ids = [];
  var tempSensors = [];
  for (var i = req.params.sensors.length - 1; i >= 0; i--) {
    
    var id = mongoose.Types.ObjectId();

    var sensorData = {
      _id: id,
      title: req.params.sensors[i].title,
      unit: req.params.sensors[i].unit,
      boxes_id: boxData._id
    };

    var sensor = new Sensor(sensorData);
    tempSensors.push(sensor);
    ids.push(sensorData._id);
  };
 	
  
 	var box = new Box(boxData);
  ids.forEach(function(tempId){
    box.sensors.push(tempId);
  });

 	box.save(function (error, data) {
		if (error) {
 			return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
		}
		else {
      tempSensors.forEach(function(tempSensor){
        tempSensor.save(function (error, data) {
          if (error) {
            return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)));
          }
          else {
            res.send(data);
          }
        });
      });
      res.json(data);
    };
		res.send(201, box);
 	});	
}