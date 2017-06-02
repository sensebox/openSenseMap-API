'use strict';

/* global describe it */

const chakram = require('chakram'),
  expect = chakram.expect;

const BASE_URL = 'http://localhost:8000',
  valid_sensebox = require('./data/valid_sensebox');

describe('openSenseMap API senseBox:home Feinstaub Addon devices', function () {

  it('should allow to register a senseBox:home Ethernet with Feinstaub Addon', function () {
    let jwt;

    return chakram.post(`${BASE_URL}/users/register`, { name: 'feinstaubAddon User', email: 'feinstaubuser@email', password: '99987654321' })
      .then(function (response) {
        expect(response).to.have.status(201);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response.body.token).to.exist;
        jwt = response.body.token;

        return chakram.post(`${BASE_URL}/boxes`, valid_sensebox({ model: 'homeEthernetFeinstaub' }), { headers: { 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(201);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        const boxId = response.body.data._id;

        return chakram.get(`${BASE_URL}/boxes/${boxId}`);
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.have.json('sensors', function (sensors) {
          expect(sensors.some(function (sensor) {
            return sensor.sensorType === 'SDS 011' && sensor.title === 'PM10';
          })).to.be.true;
          expect(sensors.some(function (sensor) {
            return sensor.sensorType === 'SDS 011' && sensor.title === 'PM2.5';
          })).to.be.true;
        });

        expect(response.body).to.not.have.keys('integrations');

        return chakram.wait();
      });
  });

  it('should allow to register a senseBox:home Wifi with Feinstaub Addon', function () {
    let jwt;

    return chakram.post(`${BASE_URL}/users/register`, { name: 'Wifi feinstaubAddon User', email: 'wififeinstaubuser@email', password: '99987654321' })
      .then(function (response) {
        expect(response).to.have.status(201);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response.body.token).to.exist;
        jwt = response.body.token;

        return chakram.post(`${BASE_URL}/boxes`, valid_sensebox({ model: 'homeWifiFeinstaub' }), { headers: { 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(201);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        const boxId = response.body.data._id;

        return chakram.get(`${BASE_URL}/boxes/${boxId}`);
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.have.json('sensors', function (sensors) {
          expect(sensors.some(function (sensor) {
            return sensor.sensorType === 'SDS 011' && sensor.title === 'PM10';
          })).to.be.true;
          expect(sensors.some(function (sensor) {
            return sensor.sensorType === 'SDS 011' && sensor.title === 'PM2.5';
          })).to.be.true;
        });

        expect(response.body).to.not.have.keys('integrations');

        return chakram.wait();
      });
  });

  it('should allow to add the feinstaub addon to the box via PUT', function () {
    let jwt;
    let sketch_old;
    let boxId;
    const update_payload = { addons: { add: 'feinstaub' } };
    let newSensors;

    return chakram.post(`${BASE_URL}/users/register`, { name: 'feinstaubAddon PUT User', email: 'feinstaubuser_put_addon@email', password: '99987654321' })
      .then(function (response) {
        expect(response).to.have.status(201);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response.body.token).to.exist;
        jwt = response.body.token;

        return chakram.post(`${BASE_URL}/boxes`, valid_sensebox({ model: 'homeWifi' }), { headers: { 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(201);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        boxId = response.body.data._id;

        return chakram.get(`${BASE_URL}/boxes/${boxId}/script`, { headers: { 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        sketch_old = response.body;

        return chakram.put(`${BASE_URL}/boxes/${boxId}`, update_payload, { headers: { 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.comprise.of.json('data.model', 'homeWifiFeinstaub');
        expect(response).to.have.json('data.sensors', function (sensors) {
          expect(sensors.some(function (sensor) {
            return sensor.sensorType === 'SDS 011' && sensor.title === 'PM10';
          })).to.be.true;
          expect(sensors.some(function (sensor) {
            return sensor.sensorType === 'SDS 011' && sensor.title === 'PM2.5';
          })).to.be.true;
        });
        newSensors = response.body.data.sensors;

        return chakram.get(`${BASE_URL}/boxes/${boxId}/script`, { headers: { 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response.body).to.not.equal(sketch_old);

        return chakram.put(`${BASE_URL}/boxes/${boxId}`, update_payload, { headers: { 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response.body.data.sensors).to.deep.equal(newSensors);

        return chakram.get(`${BASE_URL}/boxes/${boxId}`);
      });
  });

  it('should do nothing when adding the the feinstaub addon to a box other than a sensebBox:home via PUT', function () {
    let jwt;
    const update_payload = { addons: { add: 'feinstaub' } };
    const sensors = [{ title: 'temp', unit: 'K', sensorType: 'some Sensor' }];

    return chakram.post(`${BASE_URL}/users/register`, { name: 'feinstaubAddon does nothing PUT User', email: 'feinstaubuser_put_addon_not_working@email', password: '99987654321' })
      .then(function (response) {
        expect(response).to.have.status(201);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response.body.token).to.exist;
        jwt = response.body.token;

        return chakram.post(`${BASE_URL}/boxes`, valid_sensebox({ sensors }), { headers: { 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(201);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        const boxId = response.body.data._id;

        return chakram.put(`${BASE_URL}/boxes/${boxId}`, update_payload, { headers: { 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).not.to.have.json('data.model');
        expect(response).to.have.json('data.sensors', function (sensors) {
          expect(sensors.some(function (sensor) {
            return sensor.sensorType === 'SDS 011' && sensor.title === 'PM10';
          })).to.be.false;
          expect(sensors.some(function (sensor) {
            return sensor.sensorType === 'SDS 011' && sensor.title === 'PM2.5';
          })).to.be.false;
        });

      });
  });

});

