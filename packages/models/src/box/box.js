'use strict';

const { mongoose } = require('../db'),
  timestamp = require('mongoose-timestamp'),
  Schema = mongoose.Schema,
  { schema: sensorSchema, model: Sensor } = require('../sensor/sensor'),
  isEqual = require('lodash.isequal'),
  integrations = require('./integrations'),
  sensorLayouts = require('./sensorLayouts'),
  { model: Measurement } = require('../measurement/measurement'),
  imageFolder = require('config').get('openSenseMap-API-models.image_folder'),
  {
    parseTimestamp,
    utcNow
  } = require('../utils'),
  ModelError = require('../modelError'),
  Sketcher = require('@sensebox/sketch-templater'),
  fs = require('fs'),
  { point } = require('@turf/helpers'),
  log = require('../log'),
  measurementTransformer = require('../transformers/measurementsTransformer');

const templateSketcher = new Sketcher();

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
    this._deleteTheseSensors = this.sensors.filter(s => s._deleteMe);
    // remove sensor subdocuments from sensors array in box document
    if (this._deleteTheseSensors.length !== 0) {
      this.sensors.pull(...this._deleteTheseSensors);
    } else {
      this._deleteTheseSensors = undefined;
    }
    // check if there is a sensor left after deletion..
    if (this.sensors.length === 0) {
      return next(new ModelError('Unable to delete sensor(s). A box needs at least one sensor.'), { type: 'UnprocessableEntityError' });
    }

  }
  next();
});

boxSchema.post('save', function boxPostSave (savedBox) {
  // only run if sensors have changed..
  if (this._sensorsChanged === true) {
    // delete measurements of deleted sensors
    if (savedBox._deleteTheseSensors && savedBox._deleteTheseSensors.length !== 0) {
      Measurement.remove({ sensor_id: { $in: savedBox._deleteTheseSensors } }).exec();
    }
    savedBox._deleteTheseSensors = undefined;
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
    integrations
  });

};

boxSchema.statics.findBoxById = function findBoxById (id, { lean = true, populate = true, includeSecrets = false, onlyLastMeasurements = false, onlyLocations = false, format, projection = {} } = {}) {
  let fullBox = populate;
  if (populate) {
    Object.assign(projection, BOX_PROPS_FOR_POPULATION);
  }
  if (includeSecrets) {
    projection.integrations = 1;
  }
  if (onlyLastMeasurements) {
    projection = {
      sensors: 1
    };
    fullBox = false;
  }
  if (onlyLocations) {
    projection = {
      locations: 1
    };
    fullBox = false;
  }

  let findPromise = this.findById(id, projection);

  if (fullBox === true || onlyLastMeasurements === true) {
    findPromise = findPromise
      .populate(BOX_SUB_PROPS_FOR_POPULATION);
  }

  if (lean === true) {
    findPromise = findPromise
      .lean();
  }

  return findPromise
    .then(function (box) {
      if (!box) {
        throw new ModelError('Box not found', { type: 'NotFoundError' });
      }

      if (format === 'geojson') {
        const coordinates = box.currentLocation.coordinates;
        box.currentLocation = undefined;
        box.loc = undefined;

        return point(coordinates, box);
      }

      if (fullBox === true) {
        // fill in box.loc manually, as toJSON & virtuals are not supported in lean queries.
        box.loc = [{ geometry: box.currentLocation, type: 'Feature' }];
      }

      return box;
    });
};

boxSchema.methods.deleteMeasurementsOfSensor = function deleteMeasurementsOfSensor ({ sensorId, deleteAllMeasurements, timestamps, fromDate, toDate }) {
  const box = this;

  const sensor = box.sensors.find(s => s._id.equals(sensorId));
  if (!sensor) {
    throw new ModelError(`Sensor with id ${sensorId} not found or not part of this box.`, { type: 'NotFoundError' });
  }

  deleteAllMeasurements = (deleteAllMeasurements === 'true');

  if (deleteAllMeasurements === true && (timestamps || (fromDate && toDate))) {
    return Promise.reject(new ModelError('Parameter deleteAllMeasurements can only be used by itself'));
  } else if (deleteAllMeasurements === false && timestamps && fromDate && toDate) {
    return Promise.reject(new ModelError('Please specify only timestamps or a range with from-date and to-date'));
  } else if (deleteAllMeasurements === false && !timestamps && !fromDate && !toDate) {
    return Promise.reject(new ModelError('Parameter deleteAllMeasurements not true. deleting nothing'));
  }

  let createdAt;
  if (timestamps) {
    createdAt = {
      $in: timestamps.map(t => t.toDate())
    };
  }

  if (fromDate && toDate) {
    createdAt = {
      $gt: fromDate.toDate(),
      $lt: toDate.toDate()
    };
  }

  return sensor.deleteMeasurements(createdAt)
    .then(function () {
      return box.save();
    })
    .then(function () {
      let successMsg = 'all measurements';
      if (timestamps) {
        successMsg = `${timestamps.length} measurements`;
      } else if (fromDate && toDate) {
        successMsg = `measurements between ${fromDate.format()} and ${toDate.format()}`;
      }

      return `Successfully deleted ${successMsg} of sensor ${sensorId}`;
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
  const box = this;

  if (!timestamp) {
    timestamp = utcNow();
  }

  // search for temporally adjacent locations
  // (assuming that box.locations is ordered by location.timestamp)
  let loc, locIndex;
  for (locIndex = 0; locIndex < box.locations.length; locIndex++) {
    loc = box.locations[locIndex];
    if (!loc || timestamp.isBefore(loc.timestamp)) {
      loc = box.locations[locIndex - 1];
      break;
    }
  }

  // check whether we insert a new location or update a existing one, depending on spatiotemporal setting
  if (!loc && !coords) {
    // the timestamp is earlier than any location we have, but no location is provided
    // -> use the next laterLoc location (there is always one from registration)
    box.locations[locIndex - 1].timestamp = timestamp;

    return box.save().then(() => Promise.resolve(box.locations[locIndex - 1]));
  } else if (
    !loc ||
    (
      coords &&
      !isEqual(loc.coordinates, coords) &&
      !timestamp.isSame(loc.timestamp)
    )
  ) {
    // insert a new location, if coords and timestamps differ from prevLoc
    // (ensures that a box is not at multiple places at once),
    // or there is no previous location
    const newLoc = {
      type: 'Point',
      coordinates: coords,
      timestamp: timestamp
    };

    // insert the new location at right place in array
    box.locations.splice(locIndex, 0, newLoc);

    // update currentLocation, if necessary
    if (!box.locations[locIndex + 1]) {
      box.currentLocation = newLoc;
    }

    return box.save()
      .then(() => Promise.resolve(newLoc));
  }

  // coords and timestamps are equal or not provided
  // -> return unmodified previous location
  return Promise.resolve(loc);
};

boxSchema.methods.saveMeasurement = function saveMeasurement (measurement) {
  const box = this,
    sensor = box.sensors.find(s => s._id.equals(measurement.sensor_id));

  if (!sensor) {
    throw new ModelError(`Sensor not found: Sensor ${measurement.sensor_id} of box ${box._id} not found`, { type: 'NotFoundError' });
  }

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
    .then(function ([m, box]) { // m === measurement, b === box
      // only update lastMeasurement, if timestamp is actually the newest.
      if (!sensor.lastMeasurement || m.createdAt.valueOf() > sensor.lastMeasurement.createdAt.getTime()) {
        sensor.lastMeasurement = m;

        return box.save();
      }

      return Promise.resolve();
    });
};

boxSchema.methods.sensorIds = function sensorIds () {
  const sensorIds = [];
  for (let i = this.sensors.length - 1; i >= 0; i--) {
    sensorIds.push(this.sensors[i]._id.toString());
  }

  return sensorIds;
};

const findEarlierLoc = function findEarlierLoc (locations, measurement) {
  for (let i = locations.length - 1; i >= 0; i--) {
    if (measurement.createdAt.isAfter(locations[i].timestamp)) {
      return locations[i];
    }
  }
};

boxSchema.methods.saveMeasurementsArray = function saveMeasurementsArray (measurements) {
  const box = this;

  if (!Array.isArray(measurements)) {
    return Promise.reject(new Error('Array expected'));
  }

  const sensorIds = this.sensorIds(),
    lastMeasurements = {};

  // find new lastMeasurements
  // check if all the measurements belong to this box
  for (let i = measurements.length - 1; i >= 0; i--) {
    if (!sensorIds.includes(measurements[i].sensor_id)) {
      return Promise.reject(new ModelError(`Measurement for sensor with id ${measurements[i].sensor_id} does not belong to box`));
    }

    if (!lastMeasurements[measurements[i].sensor_id]) {
      lastMeasurements[measurements[i].sensor_id] = measurements[i];
    }
  }

  // iterate over all new measurements to check for location updates
  let m = 0;
  const newLocations = [];

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

boxSchema.methods.removeSelfAndMeasurements = function removeSelfAndMeasurements () {
  const box = this;

  return Measurement
    .find({ sensor_id: { $in: box.sensorIds() } })
    .remove()
    .then(function () {
      return box.remove();
    });
};

boxSchema.statics.findMeasurementsOfBoxesStream = function findMeasurementsOfBoxesStream (opts) {
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
    return Promise.reject(new Error('missing sensor query'));
  }

  return this.find(query, BOX_PROPS_FOR_POPULATION)
    .lean()
    .then(function (boxData) {
      if (boxData.length === 0) {
        throw new ModelError('No senseBoxes found', { type: 'NotFoundError' });
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
      const transformer = measurementTransformer(columns, sensors, transformations);

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
        .map(transformer);
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

boxSchema.methods.updateSensors = function updateSensors (sensors) {
  const box = this;

  for (const { _id, title, unit, sensorType, icon, deleted, edited, new: isNew } of sensors) {
    const sensorIndex = box.sensors.findIndex(s => s._id.equals(_id));
    if (sensorIndex !== -1 && deleted) {
      // marks sensor as modified and adds _deleteMe = true property to sensor
      // actual deletion happens during box preSave hook
      box.sensors[sensorIndex].markForDeletion();
    } else if (edited && isNew && sensorIndex === -1) {
      box.sensors.push(new Sensor({ title, unit, sensorType, icon }));
    } else if (sensorIndex !== -1 && edited && !deleted) {
      box.sensors.set(sensorIndex, { _id, title, unit, sensorType, icon });
    } else if (sensorIndex === -1) {
      throw new ModelError(`Sensor with id ${_id} not found for ${(deleted === true ? 'deletion' : 'editing')}.`, { type: 'NotFoundError' });
    }
  }
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

boxSchema.methods.updateBox = function updateBox (args) {
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

  const box = this;

  // only grouptag, description and weblink can removed through setting them to empty string ('')
  for (const prop of ['name', 'exposure', 'grouptag', 'description', 'weblink', 'image', 'integrations.mqtt', 'integrations.ttn']) {
    if (typeof args[prop] !== 'undefined') {
      box.set(prop, (args[prop] === '' ? undefined : args[prop]));
    }
  }

  if (sensors) {
    box.updateSensors(sensors);
  } else if (addonToAdd) {
    box.addAddon(addonToAdd);
  }

  // run location update logic, if a location was provided.
  const locPromise = location
    ? box.updateLocation(location).then(loc => box.set({ currentLocation: loc }))
    : Promise.resolve();

  return locPromise.then(function () {
    return box.save();
  });
};

boxSchema.methods.getLocations = function getLocations ({ format, fromDate, toDate }) {
  const box = this;

  const locs = box.locations.filter(function (loc) {
    return (
      fromDate.isSameOrBefore(loc.timestamp) &&
      toDate.isSameOrAfter(loc.timestamp)
    );
  });

  if (format === 'geojson') {
    const geo = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [] },
      properties: { timestamps: [] }
    };

    for (const l of locs) {
      geo.geometry.coordinates.push(l.coordinates);
      geo.properties.timestamps.push(l.timestamp);
    }

    return geo;
  }

  return locs;
};

const locFieldTransformerFunction = function locFieldTransformerFunction (box) {
  if (box.currentLocation) {
    box.loc = [{ geometry: box.currentLocation, type: 'Feature' }];
  }

  return box;
};

boxSchema.statics.findBoxesLastMeasurements = function findBoxesLastMeasurements (opts = {}) {
  const schema = this;

  const { phenomenon, fromDate, toDate } = opts,
    query = {};

  // simple string parameters
  for (const param of ['exposure', 'model', 'grouptag']) {
    if (opts[param]) {
      query[param] = { '$in': opts[param] };
    }
  }

  if (!fromDate && !toDate) {
    return Promise.resolve(schema.find(query, BOX_PROPS_FOR_POPULATION)
      .populate(BOX_SUB_PROPS_FOR_POPULATION)
      .cursor({ lean: true })
      .map(locFieldTransformerFunction) // effects of toJSON must be applied manually for streams
    );
  }

  if (phenomenon) {
    query['sensors.title'] = phenomenon;
  }

  return Measurement.findLatestMeasurementsForSensors(fromDate, toDate)
    .then(function (measurements) {
      query['sensors._id'] = {
        $in: measurements.map(m => m.sensor_id)
      };
      if (phenomenon) {
        query['sensors.title'] = phenomenon;
      }

      let measurementsLength = measurements.length;

      return schema.find(query, BOX_PROPS_FOR_POPULATION)
        .populate(BOX_SUB_PROPS_FOR_POPULATION)
        .cursor({ lean: true })
        .map(function (box) {
          if (box.currentLocation) {
            box.loc = [{ geometry: box.currentLocation, type: 'Feature' }];
          }

          for (let i = 0; i < measurementsLength; i++) { //iterate measurments
            for (const sensor of box.sensors) {
              if (sensor._id.equals(measurements[i].sensor_id)) {

                measurements[i].sensor_id = undefined;
                sensor.lastMeasurement = measurements[i];
                measurements.splice(i, 1);
                measurementsLength = measurementsLength - 1;

                return box;
              }
            }
          }

          return box;
        });
    });
};

// add integrations Schema as box.integrations & register hooks
integrations.addToSchema(boxSchema);

const boxModel = mongoose.model('Box', boxSchema);

boxModel.BOX_SUB_PROPS_FOR_POPULATION = BOX_SUB_PROPS_FOR_POPULATION;
boxModel.BOX_VALID_MODELS = sensorLayouts.models;
boxModel.BOX_VALID_ADDONS = sensorLayouts.addons;
boxModel.BOX_VALID_EXPOSURES = ['unknown', 'indoor', 'outdoor', 'mobile'];

module.exports = {
  schema: boxSchema,
  model: boxModel
};
