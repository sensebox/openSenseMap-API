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

});

