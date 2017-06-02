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
 * @apiParam (RequestBody) {String="fixed"} boxType the type of the senseBox. Currently only 'fixed' is supported.
 * @apiParam (RequestBody) {String="homeEthernet","homeWifi"} model specify the model if you want to use a predefined senseBox model.
 * @apiParam (RequestBody) {Sensor[]} sensors an array containing the sensors of this senseBox. Only use if model is unspecified
 * @apiParam (RequestBody) {MqttOption} sensors an array containing the sensors of this senseBox.
 * @apiParam (RequestBody) {Location} loc the location of this senseBox. Must be a GeoJSON Point Feature. (RFC7946)
 *
 */

/**
 * @apiDefine BoxIdParam
 *
 * @apiParam {String} :senseBoxId the ID of the senseBox you are referring to.
 */

const { mongoose } = require('../db'),
  timestamp = require('mongoose-timestamp'),
  Schema = mongoose.Schema,
  sensorSchema = require('./sensor').schema,
  integrations = require('./integrations'),
  sensorLayouts = require('../sensorLayouts'),
  mqttClient = require('../mqtt'),
  Measurement = require('./measurement').model,
  utils = require('../utils'),
  parseTimestamp = utils.parseTimestamp,
  transform = require('stream-transform');

//Location schema
const locationSchema = new Schema({
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
locationSchema.index({ 'geometry': '2dsphere' });

locationSchema.set('toJSON', {
  version: false,
  transform: function transform (doc, ret) {
    delete ret._id;

    return ret;
  }
});

//senseBox schema
const boxSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  loc: {
    type: [locationSchema],
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
}, { strict: false });
boxSchema.plugin(timestamp);
boxSchema.index({ 'loc.geometry': '2dsphere' });

const BOX_PROPS_FOR_POPULATION = {
  boxType: 1,
  createdAt: 1,
  exposure: 1,
  model: 1,
  grouptag: 1,
  image: 1,
  name: 1,
  updatedAt: 1,
  'loc.geometry': 1,
  'loc.type': 1,
  sensors: 1,
  description: 1,
};

const BOX_SUB_PROPS_FOR_POPULATION = [
  {
    path: 'sensors.lastMeasurement', select: { value: 1, createdAt: 1, _id: 0 }
  }
];

boxSchema.set('toJSON', {
  version: false,
  transform: function transform (doc, ret, options) {
    const box = {};

    for (const prop of Object.keys(BOX_PROPS_FOR_POPULATION)) {
      box[prop] = ret[prop];
    }
    box._id = ret._id;
    box.loc = ret.loc;

    if (options && options.includeSecrets) {
      box.integrations = ret.integrations;
    }

    return box;
  }
});

// initializes unsaved but validated Box document
boxSchema.statics.initNew = function (req) {
  const boxData = {
    name: req.params.name,
    boxType: req.params.boxType,
    loc: req.params.loc,
    grouptag: req.params.tag,
    exposure: req.params.exposure,
    _id: mongoose.Types.ObjectId(),
    model: req.params.model,
    sensors: req.params.sensors,
    integrations: { mqtt: { enabled: false } }
  };
  if (req.params.mqtt) {
    const { enabled, url, topic, decodeOptions, connectionOptions, messageFormat } = req.params.mqtt;
    boxData.integrations.mqtt = {
      enabled, url, topic, decodeOptions, connectionOptions, messageFormat
    };
  }

  if (req.params.ttn) {
    const { app_id, dev_id, profile, decodeOptions } = req.params.ttn;
    boxData.integrations.ttn = { app_id, dev_id, profile, decodeOptions };
  }

  // check if either a model or a sensor array has been given
  if (!boxData.model && (!boxData.sensors || !Array.isArray(boxData.sensors) || boxData.sensors.length === 0)) {
    return Promise.reject({ errors: { 'model or sensors': new Error('is required or sensors is not an non empty array') } });
  }

  // if model is not empty, get sensor definitions from products
  // otherwise, req.params.sensors should not be empty
  if (boxData.model) {
    boxData.sensors = sensorLayouts.getSensorsForModel(boxData.model);
  }

  // validate sensors
  if (!boxData.sensors || !Array.isArray(boxData.sensors)) {
    return Promise.reject({ errors: { model: new Error('is invalid or unknown') } });
  }

  // assign sensors an mongodb objectid
  for (let sensor of boxData.sensors) {
    sensor = Object.assign(sensor, { _id: mongoose.Types.ObjectId() });
  }

  // create box document but don't save it yet
  const newBox = new this(boxData);

  // validate box
  const validationErrors = newBox.validateSync();

  if (typeof validationErrors !== 'undefined') {
    return Promise.reject(validationErrors);
  }

  // there were no validationErrors.. return saved box document
  return newBox.save();
};

boxSchema.statics.connectMQTTBoxes = function () {
  this.find({ 'integrations.mqtt.enabled': true })
    .exec()
    .then(function (mqttBoxes) {
      mqttBoxes.forEach(mqttClient.connect);
    });
};

boxSchema.statics.findAndPopulateBoxById = function (id, opts) {
  let populationProps = {};
  Object.assign(populationProps, BOX_PROPS_FOR_POPULATION);

  if (opts) {
    if (opts.includeSecrets) {
      populationProps.integrations = 1;
    }
    if (opts.onlyLastMeasurements) {
      populationProps = {
        sensors: 1
      };
    }
  }

  return this.findById(id, populationProps)
    .populate(BOX_SUB_PROPS_FOR_POPULATION)
    .lean()
    .exec();
};

boxSchema.statics.findByIdAndUpdateLastMeasurementOfSensor = function findByIdAndUpdateLastMeasurementOfSensor (id, sensorId, shouldQueryLatestMeasurement) {
  let newLastMeasurementPromise = Promise.resolve();
  if (typeof shouldQueryLatestMeasurement !== 'undefined' && shouldQueryLatestMeasurement === true) {
    newLastMeasurementPromise = Measurement.findLastMeasurmentOfSensor(sensorId);
  }

  return newLastMeasurementPromise
    .then((newLastMeasurement) => { // arrow function for scope
      if (newLastMeasurement && Array.isArray(newLastMeasurement) && newLastMeasurement.length !== 0) {
        newLastMeasurement = newLastMeasurement[0]._id;
      } else { // reply was just an empty array
        newLastMeasurement = undefined;
      }

      return this.findById(id) // scope is used here
        .populate('sensor.lastMeasurement')
        .exec()
        .then(function (box) {
          let sensorFound = false;
          // apply the found new lastMeasurement
          for (const sensor of box.sensors) {
            if (sensor._id.equals(sensorId)) {
              sensor.lastMeasurement = newLastMeasurement;
              sensorFound = true;
              break;
            }
          }
          if (sensorFound === false) {
            throw new Error('SENSOR_NOT_FOUND');
          }

          return box.save();
        });
    });
};

boxSchema.methods.saveMeasurement = function (measurement) {
  const box = this;
  for (let i = box.sensors.length - 1; i >= 0; i--) {
    if (box.sensors[i]._id.equals(measurement.sensor_id)) {
      const m = new Measurement(measurement);

      box.sensors[i].lastMeasurement = m._id;

      return Promise.all([
        box.save(),
        m.save()
      ]);
    } else if (i === 0) { // the loop iterates down. if i is zero, no sensor was found with this id in the box
      return Promise.reject(`Sensor not found: Sensor ${measurement.sensor_id} of box ${box._id} not found`);
    }
  }
};

boxSchema.methods.sensorIds = function () {
  const sensorIds = [];
  for (let i = this.sensors.length - 1; i >= 0; i--) {
    sensorIds.push(this.sensors[i]._id.toString());
  }

  return sensorIds;
};

boxSchema.methods.saveMeasurementsArray = function (measurements) {
  const box = this;

  if (!measurements || measurements.length === 0) {
    return Promise.reject('cannot save empty or invalid measurements');
  }

  if (!Array.isArray(measurements)) {
    return Promise.reject('array expected');
  }

  const sensorIds = this.sensorIds(),
    lastMeasurements = {};

  // check if all measurements belong to this box
  for (const measurement of measurements) {
    if (sensorIds.indexOf(measurement.sensor_id) === -1) {
      return Promise.reject(`measurement for sensor with id ${measurement.sensor_id} does not belong to box`);
    }

    if (!lastMeasurements[measurement.sensor_id]) {
      lastMeasurements[measurement.sensor_id] = measurement;
    } else {
      const ts = parseTimestamp(measurement.createdAt),
        previous_ts = parseTimestamp(lastMeasurements[measurement.sensor_id].createdAt);
      if (ts.isAfter(previous_ts)) {
        lastMeasurements[measurement.sensor_id] = measurement;
      }
    }
  }

  return Measurement.insertMany(measurements)
    .then(function () {
      // set lastMeasurementIds..
      for (const sensor of box.sensors) {
        if (lastMeasurements[sensor._id]) {
          sensor.lastMeasurement = lastMeasurements[sensor._id]._id;
        }
      }

      //save the box
      return box.save();
    });
};

boxSchema.methods.removeSelfAndMeasurements = function () {
  return Promise.all([
    Measurement.find({ sensor_id: { $in: this.sensorIds() } }).remove(),
    this.remove()
  ]);
};

boxSchema.statics.findMeasurementsOfBoxesStream = function (opts) {
  const { query, from, to, columns, order, transformations } = opts;

  // find out which sensor property is wanted..
  let sensorProperty, phenomenon;
  if (!Object.keys(query).some(function (param) {
    if (param.startsWith('sensors.')) {
      phenomenon = query[param];
      sensorProperty = param.split('.').reverse()
        .shift();

      return true;
    }
  })) {
    return Promise.reject('missing sensor query');
  }

  return this.find(query)
    .lean()
    .exec()
    .then(function (boxData) {
      if (boxData.length === 0) {
        return Promise.reject('no senseBoxes found');
      }

      const sensors = Object.create(null);

      for (let i = 0, len = boxData.length; i < len; i++) {
        for (let j = 0, sensorslen = boxData[i].sensors.length; j < sensorslen; j++) {
          if (boxData[i].sensors[j][sensorProperty].toString() === phenomenon) {
            const sensor = boxData[i].sensors[j];

            sensor.lat = boxData[i].loc[0].geometry.coordinates[1];
            sensor.lon = boxData[i].loc[0].geometry.coordinates[0];
            sensor.boxId = boxData[i]._id.toString();
            sensor.boxName = boxData[i].name;
            sensor.exposure = boxData[i].exposure;
            sensor.sensorId = sensor._id.toString();
            sensor.phenomenon = sensor.title;

            sensors[boxData[i].sensors[j]['_id']] = sensor;
          }
        }
      }

      const transformer = transform(function (data) {
        const theData = {
          createdAt: data.createdAt,
          value: data.value
        };

        for (const col of columns) {
          if (!theData[col]) {
            theData[col] = sensors[data.sensor_id][col];
          }
        }

        if (transformations) {
          if (transformations.parseTimestamps) {
            theData.createdAt = utils.parseTimestamp(data.createdAt);
          }

          if (transformations.parseAndStringifyTimestamps) {
            theData.createdAt = utils.parseTimestamp(data.createdAt).toISOString();
          }

          if (transformations.stringifyTimestamps) {
            theData.createdAt = data.createdAt.toISOString();
          }

          if (transformations.parseValues) {
            theData.value = parseFloat(data.value);
          }
        }


        return theData;
      });

      transformer.on('error', function (err) {
        console.log(err.message);
        throw err;
      });

      return Measurement.find({
        'sensor_id': {
          '$in': Object.keys(sensors)
        },
        createdAt: {
          '$gt': from,
          '$lt': to
        }
      }, { 'createdAt': 1, 'value': 1, '_id': 0, 'sensor_id': 1 })
        .cursor({ lean: true, sort: order })
        .pipe(transformer);
    });
};

// try to add sensors defined in addons to the box. If the sensors already exist,
// nothing is done.
boxSchema.methods.addAddon = function addAddon (addon) {
  const addonSensors = sensorLayouts.getSensorsForAddon(addon);

  if (!addonSensors) {
    throw new Error('unknown Addon');
  }

  // store the model, we maybe need to change it for the generation of a new sketch
  const oldModel = this.model,
    addonNameInModel = `${addon.charAt(0).toUpperCase()}${addon.slice(1)}`;

  // only proceed if the addon hasn't been applied before
  if (oldModel && !oldModel.includes(addonNameInModel)) {
    for (const newSensor of addonSensors) {
      // only add new sensors if not already present
      if (!this.sensors.find(s => s.equals(newSensor))) {
        this.sensors.push(newSensor);
      }
    }

    // change model
    if (oldModel === 'homeEthernet' || oldModel === 'homeWifi') {
      this.set('model', `${oldModel}${addonNameInModel}`);
    }
  }

};

// add integrations Schema as box.integrations & register hooks
integrations.addToSchema(boxSchema);

const boxModel = mongoose.model('Box', boxSchema);

boxModel.BOX_PROPS_FOR_POPULATION = BOX_PROPS_FOR_POPULATION;
boxModel.BOX_SUB_PROPS_FOR_POPULATION = BOX_SUB_PROPS_FOR_POPULATION;

module.exports = {
  schema: boxSchema,
  model: boxModel
};
