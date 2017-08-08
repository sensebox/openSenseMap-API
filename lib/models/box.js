'use strict';

/**
 * @apiDefine Addons
 * @apiParam {String="feinstaub"} addon specify a sensor addon for a box.
 */

/**
 * @apiDefine BoxIdParam
 * @apiParam {String} senseBoxId the ID of the senseBox you are referring to.
 */

/**
 * @apiDefine ExposureFilterParam
 * @apiParam {String="indoor","outdoor","mobile","unknown"} [exposure] only include boxes with this exposure.
 */


const { mongoose } = require('../db'),
  timestamp = require('mongoose-timestamp'),
  Schema = mongoose.Schema,
  { schema: sensorSchema, model: Sensor } = require('./sensor'),
  isEqual = require('lodash.isequal'),
  integrations = require('./integrations'),
  sensorLayouts = require('../sensorLayouts'),
  mqttClient = require('../mqtt'),
  Measurement = require('./measurement').model,
  {
    config: { api_measurements_post_domain, imageFolder },
    parseTimestamp,
    timeIsValid,
  } = require('../utils'),
  transform = require('stream-transform'),
  log = require('../log'),
  ModelError = require('./modelError'),
  Sketcher = require('@sensebox/sketch-templater'),
  fs = require('fs');

const templateSketcher = new Sketcher(api_measurements_post_domain);

const locationSchema = new Schema({
  type: {
    type: String,
    default: 'Point',
    enum: ['Point'], // only 'Point' allowed
    required: true
  },
  coordinates: {
    type: [Number], // lng, lat, [height]
    required: true,
    validate: [function validateCoordLength (c) {
      return c.length === 2 || c.length === 3;
    }, '{PATH} must have length 2 or 3']
  },
  timestamp: {
    type: Date,
  }
}, {
  _id: false
});

//senseBox schema
const boxSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  locations: {
    type: [locationSchema],
    required: true,
  },
  currentLocation: {
    type: locationSchema,
    required: true,
  },
  exposure: {
    type: String,
    trim: true,
    required: true,
    enum: ['unknown', 'indoor', 'outdoor', 'mobile']
  },
  grouptag: {
    type: String,
    trim: true,
    required: false
  },
  model: {
    type: String,
    required: true,
    trim: true,
    default: 'custom',
    enum: ['custom', ...sensorLayouts.models]
  },
  weblink: {
    type: String,
    trim: true,
    required: false
  },
  description: {
    type: String,
    trim: true,
    required: false
  },
  image: {
    type: String,
    trim: true,
    required: false,
    /* eslint-disable func-name-matching */
    set: function imageSetter ({ type, data }) {
    /* eslint-enable func-name-matching */
      if (type && data) {
        const filename = `${this._id}_${Math.round(Date.now() / 1000).toString(36)}.${type}`;
        try {
          fs.writeFileSync(`${imageFolder}${filename}`, data);
        } catch (err) {
          log.warn(err);

          return;
        }

        return filename;
      }
    }
  },
  sensors: {
    type: [sensorSchema],
    required: [true, 'sensors are required if model is invalid or missing.'],
  }
});
boxSchema.plugin(timestamp);

const BOX_PROPS_FOR_POPULATION = {
  createdAt: 1,
  exposure: 1,
  model: 1,
  grouptag: 1,
  image: 1,
  name: 1,
  updatedAt: 1,
  currentLocation: 1,
  sensors: 1,
  description: 1,
  weblink: 1,
};

const BOX_SUB_PROPS_FOR_POPULATION = [
  {
    path: 'sensors.lastMeasurement', select: { value: 1, createdAt: 1, _id: 0 }
  },
];

boxSchema.set('toJSON', {
  version: false,
  transform: function transform (doc, ret, options) {
    const box = {};

    for (const prop of Object.keys(BOX_PROPS_FOR_POPULATION)) {
      box[prop] = ret[prop];
    }
    box._id = ret._id;
    // add deprecated loc field for backw/compat.
    // (not using virtuals, as they have issues with lean queries & population)
    box.loc = [{ geometry: box.currentLocation, type: 'Feature' }];

    if (options && options.includeSecrets) {
      box.integrations = ret.integrations;
    }

    return box;
  }
});

boxSchema.pre('save', function boxPreSave (next) {
  // check if sensors have been changed
  if (this.modifiedPaths && typeof this.modifiedPaths === 'function') {
    this._sensorsChanged = this.modifiedPaths().some(function eachPath (path) {
      return path.includes('sensors');
    });
  }

  // if sensors have been changed
  if (this._sensorsChanged === true) {
    // find out if sensors are marked for deletion
    this._deleteMeasurementsOf = [];
    for (const sensor of this.sensors) {
      if (sensor._deleteMe === true) {
        this._deleteMeasurementsOf.push(sensor._id);
        this.sensors.pull({ _id: sensor._id });
      }
    }
  }
  next();
});

boxSchema.post('save', function boxPostSave (savedBox) {
  // only run if sensors have changed..
  if (this._sensorsChanged === true) {
    // delete measurements of deleted sensors
    if (savedBox._deleteMeasurementsOf && savedBox._deleteMeasurementsOf.length !== 0) {
      Measurement.remove({ sensor_id: { $in: savedBox._deleteMeasurementsOf } }).exec();
    }
  }
});

// initializes and saves new box document
boxSchema.statics.initNew = function ({
  name,
  location,
  grouptag,
  exposure,
  model,
  sensors,
  weblink,
  mqtt: {
    enabled, url, topic, decodeOptions: mqttDecodeOptions, connectionOptions, messageFormat
  } = { enabled: false },
  ttn: {
    app_id, dev_id, port, profile, decodeOptions: ttnDecodeOptions
  } = {}
}) {
  // if model is not empty, get sensor definitions from products
  // otherwise, sensors should not be empty
  if (model && sensors) {
    return Promise.reject(new ModelError('Parameters model and sensors cannot be specified at the same time.', { type: 'UnprocessableEntityError' }));
  } else if (model && !sensors) {
    sensors = sensorLayouts.getSensorsForModel(model);
  }

  const integrations = {
    mqtt: { enabled, url, topic, decodeOptions: mqttDecodeOptions, connectionOptions, messageFormat },
  };

  if (app_id && dev_id && profile) {
    integrations.ttn = { app_id, dev_id, port, profile, decodeOptions: ttnDecodeOptions };
  }

  const boxLocation = {
    coordinates: location,
    timestamp: new Date(),
  };

  // create box document and persist in database
  return this.create({
    name,
    currentLocation: boxLocation,
    locations: [boxLocation],
    grouptag,
    exposure,
    model,
    sensors,
    weblink,
    integrations
  });

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
    // fill in box.loc manually, as toJSON & virtuals are not supported in lean queries.
    .then(function (box) {
      if (box) {box.loc = [{ geometry: box.currentLocation, type: 'Feature' }];}

      return box;
    });
};

boxSchema.statics.findByIdAndUpdateLastMeasurementOfSensor = function findByIdAndUpdateLastMeasurementOfSensor (id, sensorId, shouldQueryLatestMeasurement) {
  let newLastMeasurementPromise = Promise.resolve();
  if (typeof shouldQueryLatestMeasurement !== 'undefined' && shouldQueryLatestMeasurement === true) {
    newLastMeasurementPromise = Measurement.findLastMeasurementOfSensor(sensorId);
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
          const sensorIndex = box.sensors.findIndex(s => s._id.equals(sensorId));
          if (sensorIndex === -1) {
            throw new Error('SENSOR_NOT_FOUND');
          }

          box.set(`sensors.${sensorIndex}.lastMeasurement`, newLastMeasurement);

          return box.save();
        });
    });
};


/**
 * updates a boxes location at a given time, and performs housekeeping logic.
 * it maintains a history of locations, making it necessary to update inferred
 * locations of measurements.
 *
 * @param {Array} coords A VALIDATED array of coordinates [lng,lat,height].
 * @param {Date|String} timestamp The time associated with the coordinates.
 * @returns a Promise with the new or updated location document.
 */
boxSchema.methods.updateLocation = function updateLocation (coords, timestamp) {
  const box = this,
    locs = this.locations,
    time = parseTimestamp(timestamp);

  if (!timeIsValid(time)) {
    return Promise.reject('location time is invalid or too far in the future');
  }

  // search for temporally adjacent locations
  // (assuming that box.locations is ordered by location.timestamp)
  let prevLoc, prevLocIndex;
  for (prevLocIndex = 0; prevLocIndex < locs.length; prevLocIndex++) {
    prevLoc = locs[prevLocIndex];
    if (!prevLoc || time.isBefore(prevLoc.timestamp)) {
      prevLocIndex--;
      prevLoc = locs[prevLocIndex];
      break;
    }
  }

  // check whether we insert a new location or update a existing one, depending on spatiotemporal setting
  if (!prevLoc && !coords) {
    // the timestamp is earlier than any location we have, but no location is provided
    // -> use the next laterLoc location (there is always one from registration)
    locs[prevLocIndex + 1].timestamp = time.toDate();

    return box.save().then(() => Promise.resolve(locs[prevLocIndex + 1]));
  } else if (
    !prevLoc ||
    (
      coords &&
      !isEqual(prevLoc.coordinates, coords) &&
      !time.isSame(prevLoc.timestamp)
    )
  ) {
    // insert a new location, if coords and timestamps differ from prevLoc
    // (ensures that a box is not at multiple places at once),
    // or there is no previous location
    const newLoc = {
      type: 'Point',
      coordinates: coords,
      timestamp: time.toDate()
    };

    // insert the new location at right place in array
    box.locations.splice(prevLocIndex + 1, 0, newLoc);

    // update currentLocation, if necessary
    if (!locs[prevLocIndex + 1]) {
      box.currentLocation = newLoc;
    }

    return box.save()
      .then(() => Promise.resolve(newLoc));
  }

  // coords and timestamps are equal or not provided
  // -> return unmodified previous location
  return Promise.resolve(prevLoc);
};

boxSchema.methods.saveMeasurement = function (measurement) {
  const box = this;
  for (let i = box.sensors.length - 1; i >= 0; i--) {
    if (box.sensors[i]._id.equals(measurement.sensor_id)) {

      // add or update the location
      return box.updateLocation(measurement.location, measurement.createdAt)
      // create new measurement
        .then(function (loc) {
          measurement.location = { type: 'Point', coordinates: loc.coordinates };

          return Promise.all([
            new Measurement(measurement).save(),
            box.populate('sensors.lastMeasurement').execPopulate()
          ]);
        })
      // only update lastMeasurement, if timestamp is actually the newest.
        .then(function (results) {
          const [m, b] = results; // m === measurement, b === box
          if (!b.sensors[i].lastMeasurement || m.createdAt.getTime() > b.sensors[i].lastMeasurement.createdAt.getTime()) {
            b.sensors[i].lastMeasurement = m;

            return b.save();
          }

          return Promise.resolve();
        });
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

  for (const measurement of measurements) {
    // check if all measurements belong to this box
    if (sensorIds.indexOf(measurement.sensor_id) === -1) {
      return Promise.reject(`measurement for sensor with id ${measurement.sensor_id} does not belong to box`);
    }

    // replace createdAt with moment.js date. TODO: revert this at the end again? seems to work fine
    measurement.createdAt = parseTimestamp(measurement.createdAt);

    // cache the latest measurement for each sensor
    if (!lastMeasurements[measurement.sensor_id]) {
      lastMeasurements[measurement.sensor_id] = measurement;
    } else if (
      measurement.createdAt.isAfter(lastMeasurements[measurement.sensor_id])
    ) {
      lastMeasurements[measurement.sensor_id] = measurement;
    }
  }

  // sort measurements/locations by date
  measurements.sort((a, b) => a.createdAt.diff(b.createdAt));

  // iterate over all new measurements to check for location updates
  let m = 0;
  const newLocations = [];
  const findEarlierLoc = function findEarlierLoc (locations, measurement) {
    for (let i = locations.length - 1; i >= 0; i--) {
      if (measurement.createdAt.isAfter(locations[i].timestamp)) {
        return locations[i];
      }
    }
  };

  while (m < measurements.length) {

    // find the location in both new and existing locations, which is newest
    // in relation to the measurent time. (box.locations is sorted by date)
    const earlierLocOld = findEarlierLoc(box.locations, measurements[m]),
      earlierLocNew = findEarlierLoc(newLocations, measurements[m]);

    let loc = earlierLocOld;
    if (
      earlierLocNew &&
      parseTimestamp(earlierLocOld.timestamp).isBefore(earlierLocNew.timestamp)
    ) {
      loc = earlierLocNew;
    }

    // if measurement is earlier than first location (only occurs in first iteration)
    // use the first location of the box and redate it
    if (!loc) {
      loc = box.locations[0];
      loc.timestamp = measurements[m].createdAt;
    }

    // check if new location equals the found location.
    // if not create a new one, else reuse the found location
    if (
      measurements[m].location &&
      !isEqual(loc.coordinates, measurements[m].location)
    ) {
      loc = {
        type: 'Point',
        coordinates: measurements[m].location,
        timestamp: measurements[m].createdAt
      };

      newLocations.push(loc);
    }

    // apply location to all measurements with missing or equal location.
    do {
      measurements[m].location = { type: 'Point', coordinates: loc.coordinates };
      m++;
    } while (
      m < measurements.length &&
      (!measurements[m].location || isEqual(measurements[m].location, loc.coordinates))
    );
  }

  // save new measurements
  return Measurement.insertMany(measurements)
    .then(function () {
      const updateQuery = {};

      // set lastMeasurementIds..
      for (let i = 0; i < box.sensors.length; i++) {
        if (lastMeasurements[box.sensors[i]._id]) {
          if (!updateQuery.$set) {
            updateQuery.$set = {};
          }

          const measureId = lastMeasurements[box.sensors[i]._id]._id;
          updateQuery.$set[`sensors.${i}.lastMeasurement`] = measureId;
        }
      }

      if (newLocations.length) {
        // add the new locations to the box
        updateQuery.$push = {
          locations: { $each: newLocations, $sort: { timestamp: 1 } }
        };

        // update currentLocation if necessary
        const latestNewLocation = newLocations[newLocations.length - 1];
        if (latestNewLocation.timestamp.isAfter(box.currentLocation.timestamp)) {
          if (!updateQuery.$set) {
            updateQuery.$set = {};
          }

          updateQuery.$set.currentLocation = latestNewLocation;
        }
      }

      return boxModel.update({ _id: box._id }, updateQuery);
    });
};

boxSchema.methods.removeSelfAndMeasurements = function () {
  const box = this;

  return Measurement
    .find({ sensor_id: { $in: box.sensorIds() } })
    .remove()
    .then(function () {
      return box.remove();
    });
};

boxSchema.statics.findMeasurementsOfBoxesStream = function (opts) {
  const { query, bbox, from, to, columns, order, transformations } = opts;

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

  return this.find(query, BOX_PROPS_FOR_POPULATION)
    .populate(BOX_SUB_PROPS_FOR_POPULATION)
    .lean()
    .then(function (boxData) {
      if (boxData.length === 0) {
        return Promise.reject('no senseBoxes found');
      }

      const sensors = Object.create(null);

      // store all matching sensors under sensors[sensorId]
      for (let i = 0, len = boxData.length; i < len; i++) {
        for (let j = 0, sensorslen = boxData[i].sensors.length; j < sensorslen; j++) {
          if (boxData[i].sensors[j][sensorProperty].toString() === phenomenon) {
            const sensor = boxData[i].sensors[j];

            sensor.lat = boxData[i].currentLocation.coordinates[1];
            sensor.lon = boxData[i].currentLocation.coordinates[0];
            sensor.height = boxData[i].currentLocation.coordinates[2];
            sensor.boxId = boxData[i]._id.toString();
            sensor.boxName = boxData[i].name;
            sensor.exposure = boxData[i].exposure;
            sensor.sensorId = sensor._id.toString();
            sensor.phenomenon = sensor.title;

            sensors[boxData[i].sensors[j]['_id']] = sensor;
          }
        }
      }

      // construct a stream transformer applied to queried measurements
      // that augments each measure with queried columns (location, ...)
      // and applies transformations to timestamps
      const transformer = transform(function (data) {
        const theData = {
          createdAt: data.createdAt,
          value: data.value
        };

        // add all queried columns to the result
        for (const col of columns) {
          if (theData[col]) {
            continue;
          }

          theData[col] = sensors[data.sensor_id][col];

          // extract location columns. fall back to box.currentLocation if unavailable
          switch (col) {
          case 'lat':
            theData.lat = data.location
              ? data.location.coordinates[1]
              : sensors[data.sensor_id].lat;
            break;
          case 'lon':
            theData.lon = data.location
              ? data.location.coordinates[0]
              : sensors[data.sensor_id].lon;
            break;
          case 'height':
            theData.height = data.location
              ? data.location.coordinates[2]
              : sensors[data.sensor_id].height;
            break;
          default:
            break;
          }
        }

        if (transformations) {
          if (transformations.parseTimestamps) {
            theData.createdAt = parseTimestamp(data.createdAt);
          }

          if (transformations.parseAndStringifyTimestamps) {
            theData.createdAt = parseTimestamp(data.createdAt).toISOString();
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
        log.error(err);
        throw err;
      });

      const measureQuery = {
        'sensor_id': { '$in': Object.keys(sensors) },
        'createdAt': { '$gt': from, '$lt': to }
      };

      if (bbox) {
        measureQuery['$or'] = [
          { 'location': { '$geoWithin': { '$geometry': bbox } } },
          { 'location': { '$exists': false } } // support old measurements without 'location' field
        ];
      }

      return Measurement.find(measureQuery, { 'createdAt': 1, 'value': 1, 'location': 1, '_id': 0, 'sensor_id': 1 })
        .cursor({ lean: true, sort: order })
        .pipe(transformer);
    });
};

// try to add sensors defined in addons to the box. If the sensors already exist,
// nothing is done.
boxSchema.methods.addAddon = function addAddon (addon) {
  addon = addon.trim().toLowerCase();
  const addonSensors = sensorLayouts.getSensorsForAddon(addon);

  if (!addonSensors) {
    throw new Error('unknown Addon');
  }

  // store the model, we maybe need to change it for the generation of a new sketch
  const oldModel = this.model,
    allowedModelsForAddon = ['homeEthernet', 'homeWifi'],
    addonNameInModel = `${addon.charAt(0).toUpperCase()}${addon.slice(1)}`;

  // only proceed if the addon hasn't been applied before
  if (allowedModelsForAddon.includes(oldModel)) {
    for (const newSensor of addonSensors) {
      // only add new sensors if not already present
      if (!this.sensors.find(s => s.equals(newSensor))) {
        this.sensors.push(newSensor);
      }
    }

    // change model
    if (allowedModelsForAddon.includes(oldModel)) {
      this.set('model', `${oldModel}${addonNameInModel}`);
    }
  }
};

boxSchema.methods.addSensor = function addSensor ({ title, unit, sensorType, icon }) {
  this.sensors.push(new Sensor({ title, unit, sensorType, icon }));
};

boxSchema.methods.updateImage = function updateImage ({ type, data }) {
  if (type && data) {
    const extension = (type === 'image/jpeg') ? '.jpg' : '.png';
    fs.writeFileSync(`${imageFolder}${this._id}${extension}`, data);
    this.set('image', `${this._id}${extension}?${new Date().getTime()}`);
  }
};

boxSchema.methods.getSketch = function getSketch ({ encoding } = {}) {
  return templateSketcher.generateSketch(this, { encoding });
};

boxSchema.statics.findBoxByIdAndUpdate = function findBoxByIdAndUpdate (boxId, args) {
  const {
    mqtt: {
      enabled,
      url,
      topic,
      decodeOptions: mqttDecodeOptions,
      connectionOptions,
      messageFormat
    } = {},
    ttn: {
      app_id,
      dev_id,
      port,
      profile,
      decodeOptions: ttnDecodeOptions
    } = {},
    location,
    sensors,
    addons: { add: addonToAdd } = {}
  } = args;


  if (sensors && addonToAdd) {
    return Promise.reject(new ModelError('sensors and addons can not appear in the same request.'));
  }

  if (args.mqtt) {
    args['integrations.mqtt'] = { enabled, url, topic, decodeOptions: mqttDecodeOptions, connectionOptions, messageFormat };
  }
  if (args.ttn) {
    args['integrations.ttn'] = { app_id, dev_id, port, profile, decodeOptions: ttnDecodeOptions };
  }

  return this.findById(boxId)
    .then(function (box) {
      // only grouptag, description and weblink can removed through setting them to empty string ('')
      for (const prop of ['name', 'exposure', 'grouptag', 'description', 'weblink', 'image', 'integrations.mqtt', 'integrations.ttn']) {
        if (typeof args[prop] !== 'undefined') {
          box.set(prop, (args[prop] === '' ? undefined : args[prop]));
        }
      }

      if (sensors) {
        for (const { _id, title, unit, sensorType, icon, deleted, edited, new: isNew } of sensors) {
          const sensorIndex = box.sensors.findIndex(s => s._id.equals(_id));
          if (sensorIndex !== -1 && deleted) {
            box.sensors[sensorIndex].markForDeletion();
          } else if (edited && isNew && sensorIndex === -1) {
            box.addSensor({ _id, title, unit, sensorType, icon });
          } else if (sensorIndex !== -1 && edited && !deleted) {
            box.sensors.set(sensorIndex, { _id, title, unit, sensorType, icon });
          }
        }
      } else if (addonToAdd) {
        box.addAddon(addonToAdd);
      }

      // run location update logic, if a location was provided.
      const locPromise = location
        ? box.updateLocation(location, new Date()).then(loc => box.set({ currentLocation: loc }))
        : Promise.resolve();

      return locPromise.then(function () {
        return box.save();
      });
    });
};

// add integrations Schema as box.integrations & register hooks
integrations.addToSchema(boxSchema);

const boxModel = mongoose.model('Box', boxSchema);

boxModel.BOX_PROPS_FOR_POPULATION = BOX_PROPS_FOR_POPULATION;
boxModel.BOX_SUB_PROPS_FOR_POPULATION = BOX_SUB_PROPS_FOR_POPULATION;
boxModel.BOX_VALID_MODELS = sensorLayouts.models;
boxModel.BOX_VALID_ADDONS = sensorLayouts.addons;
boxModel.BOX_VALID_EXPOSURES = ['unknown', 'indoor', 'outdoor', 'mobile'];

module.exports = {
  schema: boxSchema,
  model: boxModel
};
