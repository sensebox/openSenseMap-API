'use strict';
/**
 * define for the senseBox request body encoded in JSON
 * @apiDefine RequestBody JSON request body
 */

/**
 * @apiDefine CommonBoxJSONBody
 *
 * @apiParam (RequestBody) {String} name the name of this senseBox.
 * @apiParam (RequestBody) {String} grouptag the grouptag of this senseBox.
 * @apiParam (RequestBody) {String="indoor","outdoor"} exposure the exposure of this senseBox.
 * @apiParam (RequestBody) {String} grouptag the grouptag of this senseBox.
 * @apiParam (RequestBody) {String="fixed"} boxType the type of the senseBox. Currently only 'fixed' is supported.
 * @apiParam (RequestBody) {Sensor[]} sensors an array containing the sensors of this senseBox.
 * @apiParam (RequestBody) {MqttOption} sensors an array containing the sensors of this senseBox.
 * @apiParam (RequestBody) {Location} loc the location of this senseBox. Must be a GeoJSON Point Feature. (RFC7946)
 *
 */

/**
 * @apiDefine BoxIdParam
 *
 * @apiParam {String} :senseBoxId the ID of the senseBox you are referring to.
 */

let mongoose = require('mongoose'),
  timestamp = require('mongoose-timestamp'),
  Schema = mongoose.Schema,
  sensorSchema = require('./sensor').schema,
  products = require('../../products'),
  mqttClient = require('../mqtt'),
  Measurement = require('./measurement').model,
  utils = require('../utils'),
  mails = require('../mails'),
  parseTimestamp = utils.parseTimestamp,
  User = require('./user').model,
  sketches = require('../sketches'),
  transform = require('stream-transform'),
  Honeybadger = utils.Honeybadger;

//Location schema
let LocationSchema = new Schema({
  type: {
    type: String,
    required: true,
    default: 'Feature',
    enum: ['Feature', 'feature']
  },
  geometry: {
    type: {
      type: String,
      required: true,
      default: 'Point',
      enum: ['Point', 'point']
    },
    coordinates: {
      type: Array,
      required: true
    }
  },
  properties: Schema.Types.Mixed
});
LocationSchema.index({ 'geometry': '2dsphere' });

//senseBox schema
let boxSchema = new Schema({
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
  weblink: {
    type: String,
    required: false
  },
  description: {
    type: String,
    required: false
  },
  sensors: [sensorSchema]
},{ strict: false });
boxSchema.plugin(timestamp);
boxSchema.index({ 'loc.geometry': '2dsphere' });

boxSchema.add({
  mqtt: {
    url: { type: String, trim: true },
    topic: { type: String, trim: true },
    messageFormat: { type: String, trim: true, enum: ['json', 'csv', 'application/json', 'text/csv', 'debug_plain'] },
    decodeOptions: { type: String, trim: true },
    connectionOptions: { type: String, trim: true }
  }
});

boxSchema.statics.newFromRequest = function (req) {
  let boxData = {
      name: req.params.name,
      boxType: req.params.boxType,
      loc: req.params.loc,
      grouptag: req.params.tag,
      exposure: req.params.exposure,
      _id: mongoose.Types.ObjectId(),
      model: req.params.model,
      sensors: req.params.sensors,
      mqtt: req.params.mqtt
    },
    userData;
  if (!req.user) {
    userData = {
      firstname: req.params.user.firstname,
      lastname: req.params.user.lastname,
      email: req.params.user.email,
      apikey: req.params.orderID,
      boxes: [boxData._id],
      language: req.params.user.lang
    };
  } else {
    return Promise.reject(['ValidationError: Path `user` is required.']);
  }

  // if model is not empty, get sensor definitions from products
  // otherwise, req.params.sensors should not be empty
  if (req.params.model) {
    switch (req.params.model) {
    case 'homeEthernet':
      boxData.sensors = products.senseboxhome;
      break;
    case 'homeWifi':
      boxData.sensors = products.senseboxhome;
      break;
    case 'basicEthernet':
      boxData.sensors = products.senseboxbasic;
      break;
    default:
      break;
    }
  }

  // assign sensors an mongodb objectid
  for (let i = boxData.sensors.length - 1; i >= 0; i--) {
    boxData.sensors[i] = Object.assign(boxData.sensors[i], { _id: mongoose.Types.ObjectId() });
  }

  // create Documents but don't save them yet
  let newBox = new this(boxData),
    newUser = new User(userData);

  // validate box and user
  let validationErrors = [newBox.validateSync(), newUser.validateSync()];

  if (validationErrors.some(e => typeof e !== 'undefined')) {
    return Promise.reject(validationErrors);
  }

  // there were no validationErrors.. save both user and box
  // and return a Promise with the userData
  return Promise.all([newBox.save(), newUser.save()])
    .then(function () {
      sketches.generateSketch(newBox);
      utils.postToSlack('Eine neue <https://opensensemap.org/explore/' + newBox._id + '|senseBox> wurde registriert (' + newBox.name + ')');
      mails.sendWelcomeMail(newUser, newBox);
      return newUser;
    });
};

boxSchema.statics.connectMQTTBoxes = function () {
  this.where('mqtt').exists(true).exec()
    .then(function (mqttBoxes) {
      mqttBoxes.forEach(mqttClient.connect);
    });
};

const BOX_PROPS_FOR_POPULATION = {
  boxType: 1,
  createdAt: 1,
  exposure: 1,
  model: 1,
  grouptag: 1,
  image: 1,
  name: 1,
  updatedAt: 1,
  loc: 1,
  sensors: 1,
  description: 1,
};

boxSchema.statics.findAndPopulateBoxById = function (id, opts) {
  let populationProps = {};
  Object.assign(populationProps, BOX_PROPS_FOR_POPULATION);

  if (opts) {
    if (opts.includeSecrets) {
      populationProps.mqtt = 1;
    }
    if (opts.onlyLastMeasurements) {
      populationProps = {
        sensors: 1
      };
    }
  }

  return this.findById(id, populationProps)
    .populate([
      {
        path: 'sensors.lastMeasurement', select: { value: 1, createdAt: 1, _id: 0 }
      },
      {
        path: 'loc', select: { _id: 0 }
      }
    ])
    .lean()
    .exec();
};

boxSchema.methods.saveMeasurement = function (measurement) {
  let box = this;
  for (let i = box.sensors.length - 1; i >= 0; i--) {
    if (box.sensors[i]._id.equals(measurement.sensor_id)) {
      let m = new Measurement(measurement);

      box.sensors[i].lastMeasurement = m._id;
      return Promise.all([
        box.save(),
        m.save()
      ]);
    } else if (i === 0) { // the loop iterates down. if i is zero, no sensor was found with this id in the box
      return Promise.reject('sensor ' + measurement.sensor_id + ' of box ' + box._id + ' not found');
    }
  }
};

boxSchema.methods.sensorIds = function () {
  let sensorIds = [];
  for (let i = this.sensors.length - 1; i >= 0; i--) {
    sensorIds.push(this.sensors[i]._id.toString());
  }
  return sensorIds;
};

boxSchema.methods.saveMeasurementsArray = function (measurements) {
  let box = this;

  if (!measurements) {
    return Promise.reject('cannot save empty or invalid measurements');
  }

  if (!Array.isArray(measurements)) {
    return Promise.reject('array expected');
  }

  let sensorIds = this.sensorIds(),
    lastMeasurements = {};

  // check if all measurements belong to this box
  for (let measurement of measurements) {
    if (sensorIds.indexOf(measurement.sensor_id) === -1) {
      return Promise.reject('measurement for sensor with id ' + measurement.sensor_id + ' does not belong to box');
    }

    if (!lastMeasurements[measurement.sensor_id]) {
      lastMeasurements[measurement.sensor_id] = measurement;
    } else {
      let ts = parseTimestamp(measurement.createdAt),
        previous_ts = parseTimestamp(lastMeasurements[measurement.sensor_id].createdAt);
      if (ts.isAfter(previous_ts)) {
        lastMeasurements[measurement.sensor_id] = measurement;
      }
    }
  }

  return Measurement.insertMany(measurements)
    .then(function () {
      // set lastMeasurementIds..
      for (let sensor of box.sensors) {
        if (lastMeasurements[sensor._id]) {
          sensor.lastMeasurement = lastMeasurements[sensor._id]._id;
        }
      }

      //save the box
      return box.save();
    });
};

boxSchema.statics.deleteBox = function (boxId) {
  return this.findById(boxId).exec()
    .then(function (box) {
      if (!box) {
        throw 'senseBox not found';
      }
      let removeTheRest = box.sensors.map(sensor => Measurement.find({ sensor_id: sensor._id }).remove());
      removeTheRest.push(...[box.remove(), User.findOneAndRemove({ 'boxes': { '$in': [boxId] } })]);
      return Promise.all(removeTheRest);
    });
};

boxSchema.statics.findMeasurementsOfBoxesStream = function (boxQuery, phenomenon, from, to, columns) {

  // find out which sensor property is wanted..
  let sensorProperty;
  if (!Object.keys(boxQuery).some(function (param) {
    if (param.startsWith('sensors.')) {
      sensorProperty = param.split('.').reverse().shift();
      return true;
    }
  })) {
    return Promise.reject('missing sensor query');
  }

  return this.find(boxQuery)
    .lean()
    .exec()
    .then(function (boxData) {
      let sensors = Object.create(null);

      for (let i = 0, len = boxData.length; i < len; i++) {
        for (let j = 0, sensorslen = boxData[i].sensors.length; j < sensorslen; j++) {
          if (boxData[i].sensors[j][sensorProperty].toString() === phenomenon) {
            let sensor = boxData[i].sensors[j];

            sensor.lat = boxData[i].loc[0].geometry.coordinates[0];
            sensor.lng = boxData[i].loc[0].geometry.coordinates[1];
            sensor.boxId = boxData[i]._id.toString();
            sensor.boxName = boxData[i].name;
            sensor.exposure = boxData[i].exposure;
            sensor.sensorId = sensor._id.toString();
            sensor.phenomenon = sensor.title;

            sensors[boxData[i].sensors[j]['_id']] = sensor;
          }
        }
      }

      let transformer = transform(function (data) {
        let theData = {
          createdAt: utils.parseTimestamp(data.createdAt).toISOString(),
          value: data.value
        };

        for (let col of columns) {
          if (!theData[col]) {
            theData[col] = sensors[data.sensor_id][col];
          }
        }

        return theData;
      });

      transformer.on('error', function (err) {
        console.log(err.message);
        Honeybadger.notify(err);
      });

      return Measurement.find({
        'sensor_id': {
          '$in': Object.keys(sensors)
        },
        createdAt: {
          '$gt': from,
          '$lt': to
        }
      }, {'createdAt': 1, 'value': 1, '_id': 0, 'sensor_id': 1})
        .lean()
        .cursor({ batchSize: 500 })
        .pipe(transformer);
    });
};

let checkMqttChanged = function (next) {
  if (this.modifiedPaths && typeof this.modifiedPaths === 'function') {
    this._mqttChanged = this.modifiedPaths().some(function (path) {
      return path.indexOf('mqtt') !== -1;
    });
  }
  next();
};

let reconnectMqttOnChanged = function (box) {
  if (box._mqttChanged === true) {
    console.log('mqtt credentials changed, reconnecting');
    mqttClient.connect(box);
    box._mqttChanged = undefined;
  }
};

// .pre('update', .. is a Query
// .pre('save', .. looks like a Document

boxSchema.pre('save', checkMqttChanged);
//boxSchema.pre('update', checkMqttChanged);

boxSchema.post('save', reconnectMqttOnChanged);
//boxSchema.post('update', reconnectMqttOnChanged);

boxSchema.pre('remove', function (next) {
  mqttClient.disconnect(this);
  next();
});

let boxModel = mongoose.model('Box', boxSchema);

module.exports = {
  schema: boxSchema,
  model: boxModel
};
