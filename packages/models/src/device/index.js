'use strict';

const crypto = require('crypto');
const { deviceTable, sensorTable, accessTokenTable } = require('../../schema/schema');
const sensorLayouts = require('../box/sensorLayouts');
const { db } = require('../drizzle');
const ModelError = require('../modelError');
const { inArray, arrayContains, sql, eq, asc } = require('drizzle-orm');
const { insertMeasurement, insertMeasurements } = require('../measurement');
const SketchTemplater = require('@sensebox/sketch-templater');

const { max_boxes: pagination_max_boxes } = require('config').get('openSenseMap-API-models.pagination');

const templateSketcher = new SketchTemplater();

const buildWhereClause = function buildWhereClause (opts = {}) {
  const { phenomenon, fromDate, toDate, bbox, near, maxDistance, grouptag } = opts;
  const clause = [];

  // simple string parameters
  for (const param of ['exposure', 'model']) {
    if (opts[param]) {
      clause.push(inArray(deviceTable[param], opts[param]));
    }
  }

  if (grouptag) {
    clause.push(arrayContains(deviceTable['tags'], opts['grouptag']));
  }

  // https://orm.drizzle.team/learn/guides/postgis-geometry-point
  if (bbox) {
    // TODO: checkout postgis bbox queries
  }

  if (near) {
    // TODO: implement
  }

  if (fromDate || toDate) {
    if (phenomenon) {
      // TODO: implement
    }
  }

  return clause;
};

const createDevice = async function createDevice (userId, params) {
  const { name, exposure, description, location, model, grouptag, sensorTemplates } = params;
  let { sensors, useAuth } = params;

  // if model is not empty, get sensor definitions from products
  // otherwise, sensors should not be empty
  if (model && sensors) {
    return Promise.reject(new ModelError('Parameters model and sensors cannot be specified at the same time.', { type: 'UnprocessableEntityError' }));
  } else if (model && !sensors) {
    if (sensorTemplates) {
      const layout = sensorLayouts.getSensorsForModel(model);
      sensors = [];
      for (const sensor of layout) {
        if (sensorTemplates.includes(sensor['sensorType'].toLowerCase())) {
          sensors.push(sensor);
        }
      }
    } else {
      sensors = sensorLayouts.getSensorsForModel(model);
    }
  }
  if (model) {
    //activate useAuth only for certain models until all sketches are updated
    if (['homeV2Lora', 'homeV2Ethernet', 'homeV2EthernetFeinstaub', 'homeV2Wifi', 'homeV2WifiFeinstaub', 'homeEthernet', 'homeWifi', 'homeEthernetFeinstaub', 'homeWifiFeinstaub', 'hackair_home_v2'].indexOf(model) !== -1) {
      useAuth = true;
    } else {
      useAuth = false;
    }
  }

  // TODO: handle in transaction
  const [device] = await db.insert(deviceTable).values({
    userId,
    name,
    exposure,
    description,
    latitude: location[1],
    longitude: location[0],
    location: { x: location[1], y: location[0] },
    useAuth,
    model,
    tags: grouptag
  })
    .returning();

  const [accessToken] = await db.insert(accessTokenTable).values({
    deviceId: device.id,
    token: crypto.randomBytes(32).toString('hex')
  })
    .returning({ token: accessTokenTable.token });

  // Iterate over sensors and add device id
  sensors = sensors.map((sensor) => ({
    deviceId: device.id,
    ...sensor
  }));

  const deviceSensors = await db.insert(sensorTable).values(sensors)
    .returning();

  device['accessToken'] = accessToken.token;
  device['sensors'] = deviceSensors;

  return device;
};

const deleteDevice = async function (filter) {
  return await db.delete(deviceTable).where(filter)
    .returning();
};

const findById = async function findById (deviceId, relations = {}) {
  const device = await db.query.deviceTable.findFirst({
    where: (device, { eq }) => eq(device.id, deviceId),
    ...(Object.keys(relations).length !== 0 && { with: relations })
  });

  return device;
};

const findDevicesByUserId = async function findDevicesByUserId (userId, opts = {}) {
  const { page } = opts;
  const devices = await db.query.deviceTable.findMany({
    where: (device, { eq }) => eq(device.userId, userId),
    orderBy: (asc(deviceTable.createdAt)),
    limit: pagination_max_boxes,
    offset: pagination_max_boxes * page
  });

  return devices;
};

const findDevices = async function findDevices (opts = {}, columns = {}) {
  const { name, limit } = opts;
  const devices = await db.query.deviceTable.findMany({
    ...(Object.keys(columns).length !== 0 && { columns }),
    where: (device, { ilike }) => ilike(device.name, `%${name}%`),
    limit
  });

  return devices;
};

// TODO: merge with findDevices
const findDevicesMinimal = async function findDevicesMinimal (opts = {}, columns = {}) {
  const whereClause = buildWhereClause(opts);
  const devices = await db.query.deviceTable.findMany({
    ...(Object.keys(columns).length !== 0 && { columns }),
    ...(Object.keys(whereClause).length !== 0 && { where: (_, { and }) => and(...whereClause) })
  });

  return devices;
};

const findTags = async function findTags () {
  const tags = await db.execute(sql`SELECT array_agg(DISTINCT u.val) tags FROM device d CROSS JOIN LATERAL unnest(d.tags) AS u(val);`);

  return tags.rows[0].tags;
};

const findAccessToken = async function findAccessToken (deviceId) {
  const token = await db.query.accessTokenTable.findFirst({
    where: (token, { eq }) => eq(token.deviceId, deviceId)
  });

  return token;
};

const saveMeasurement = async function saveMeasurement (device, measurement) {

  const sensor = device.sensors.find(sensor => sensor.id === measurement.sensor_id);

  if (!sensor) {
    throw new ModelError(`Sensor not found: Sensor ${measurement.sensor_id} of box ${device.id} not found`, { type: 'NotFoundError' });
  }

  await insertMeasurement(measurement);
};

const saveMeasurements = async function saveMeasurements (device, measurements) {

  if (!Array.isArray(measurements)) {
    return Promise.reject(new Error('Array expected'));
  }

  const sensorIds = this.sensorIds(),
    lastMeasurements = {};

  // TODO: refactor
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

  // TODO: check if we can merge this with `saveMeasurement`

  await insertMeasurements(measurements);
};

const updateDevice = async function updateDevice (deviceId, args) {
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

  if (args.mqtt) {
    args['integrations.mqtt'] = {
      enabled,
      url,
      topic,
      decodeOptions: mqttDecodeOptions,
      connectionOptions,
      messageFormat
    };
  }
  if (args.ttn) {
    args['integrations.ttn'] = {
      app_id,
      dev_id,
      port,
      profile,
      decodeOptions: ttnDecodeOptions
    };
  }

  if (args.mqtt) {
    args['integrations.mqtt'] = {
      enabled,
      url,
      topic,
      decodeOptions: mqttDecodeOptions,
      connectionOptions,
      messageFormat
    };
  }
  if (args.ttn) {
    args['integrations.ttn'] = {
      app_id,
      dev_id,
      port,
      profile,
      decodeOptions: ttnDecodeOptions
    };
  }

  const setColumns = {};
  for (const prop of [
    'name',
    'exposure',
    'grouptag',
    'description',
    'weblink',
    'image',
    // 'integrations.mqtt',
    // 'integrations.ttn',
    'model',
    'useAuth'
  ]) {
    if (typeof args[prop] !== 'undefined') {
      setColumns[prop] = args[prop];

      if (prop === 'grouptag') {
        setColumns['tags'] = args[prop];
      }
    }
  }

  // TODO: generate new access token
  // if user wants a new access_token
  // if (typeof args['generate_access_token'] !== 'undefined') {
  //   if (args['generate_access_token'] === 'true') {
  //     // Create new acces token for box
  //     const access_token = crypto.randomBytes(32).toString('hex');
  //     box.set('access_token', access_token);
  //   }
  // }

  // TODO update sensors
  // if (sensors) {
  //   box.updateSensors(sensors);
  // } else if (addonToAdd) {
  //   box.addAddon(addonToAdd);
  // }

  // TODO: run location update logic, if a location was provided.
  // const locPromise = location
  //   ? box
  //       .updateLocation(location)
  //       .then((loc) => box.set({ currentLocation: loc }))
  //   : Promise.resolve();

  const device = await db
    .update(deviceTable)
    .set(setColumns)
    .where(eq(deviceTable.id, deviceId))
    .returning();

  return device[0];
};

const generateSketch = function generateSketch (device, {
  encoding,
  serialPort,
  soilDigitalPort,
  soundMeterPort,
  windSpeedPort,
  ssid,
  password,
  devEUI,
  appEUI,
  appKey,
  access_token,
  display_enabled
} = {}) {
  if (serialPort) {
    device.serialPort = serialPort;
  }
  if (soilDigitalPort) {
    device.soilDigitalPort = soilDigitalPort;
  }
  if (soundMeterPort) {
    device.soundMeterPort = soundMeterPort;
  }
  if (windSpeedPort) {
    device.windSpeedPort = windSpeedPort;
  }

  device.ssid = ssid || '';
  device.password = password || '';
  device.devEUI = devEUI || '';
  device.appEUI = appEUI || '';
  device.appKey = appKey || '';
  device.access_token = access_token || '';
  device.display_enabled = display_enabled || '';

  return templateSketcher.generateSketch(device, { encoding });
};

module.exports = {
  createDevice,
  updateDevice,
  deleteDevice,
  findById,
  findDevices,
  findDevicesMinimal,
  findDevicesByUserId,
  findTags,
  findAccessToken,
  saveMeasurement,
  saveMeasurements,
  generateSketch
};
