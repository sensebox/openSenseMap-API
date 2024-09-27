'use strict';

const crypto = require('crypto');
const { deviceTable, sensorTable, accessTokenTable } = require('../../schema/schema');
const sensorLayouts = require('../box/sensorLayouts');
const { db } = require('../drizzle');
const ModelError = require('../modelError');

const createDevice = async function createDevice (userId, params) {
  const { model, sensorTemplates } = params;
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

  const [device] = await db.insert(deviceTable).values({
    userId,
    name: params.name,
    exposure: params.exposure,
    description: params.description,
    latitude: params.location[1],
    longitude: params.location[0],
    useAuth,
    model: 'HOME_V2_LORA'
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

module.exports = {
  createDevice
};
