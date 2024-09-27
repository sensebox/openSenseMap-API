'use strict';

const crypto = require('crypto');
const { deviceTable, sensorTable, accessTokenTable } = require('../../schema/schema');
const sensorLayouts = require('../box/sensorLayouts');
const { db } = require('../drizzle');
const ModelError = require('../modelError');

const createDevice = async function createDevice (userId, params) {
  const { name, exposure, description, location, model, sensorTemplates } = params;
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
    useAuth,
    model
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

const findById = async function findById (deviceId) {
  const device = await db.query.deviceTable.findFirst({
    where: (device, { eq }) => eq(device.id, deviceId)
  });

  return device;
};

module.exports = {
  createDevice,
  deleteDevice,
  findById
};
