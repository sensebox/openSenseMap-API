'use strict';

/* global describe it */

const chakram = require('chakram'),
  expect = chakram.expect,
  moment = require('moment');

const BASE_URL = process.env.OSEM_TEST_BASE_URL,
  valid_sensebox = require('../data/valid_sensebox'),
  hackair_example_data = require('../data/hackair_example_data');

describe('openSenseMap API hackAIR devices', function () {
  let jwt, hackair_home_v2_id, access_token;

  it('should allow to register a hackAIR homev2 sensor', () => {
    return chakram.post(`${BASE_URL}/users/register`, { name: 'hackair user', email: 'hackair@email', password: 'hackairrocks' })
      .then(function (response) {
        expect(response).to.have.status(201);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response.body.token).to.exist;
        jwt = response.body.token;

        return chakram.post(`${BASE_URL}/boxes`, valid_sensebox({ model: 'hackair_home_v2', name: 'hackair' }), { headers: { 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(201);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        const boxId = response.body.data._id;
        access_token = response.body.data.access_token;
        hackair_home_v2_id = boxId;

        return chakram.get(`${BASE_URL}/boxes/${boxId}`);
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.have.json('sensors', function (sensors) {
          expect(sensors.some(function (sensor) {
            return sensor.title === 'PM10';
          })).to.be.true;
          expect(sensors.some(function (sensor) {
            return sensor.title === 'PM2.5';
          })).to.be.true;
        });

        expect(response.body).to.not.have.keys('integrations');
        expect(response.body).to.not.have.keys('access_token');

        return chakram.wait();
      });
  });

  it('should accept measurements from hackair devices', () => {
    let submitTime;

    return chakram.post(`${BASE_URL}/boxes/${hackair_home_v2_id}/data?hackair=true`, hackair_example_data, { headers: { 'Authorization': `${access_token}` } })
      .then(function (response) {
        submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
        expect(response).to.have.status(201);

        return chakram.get(`${BASE_URL}/boxes/${hackair_home_v2_id}`);
      })
      .then(function (response) {
        expect(response).to.have.json('sensors', function (sensors) {
          sensors.forEach(function (sensor) {
            if (['PM10', 'PM2.5'].includes(sensor.title)) {
              expect(sensor.lastMeasurement).not.to.be.null;
              expect(sensor.lastMeasurement.createdAt).to.exist;
              const createdAt = moment.utc(sensor.lastMeasurement.createdAt);
              expect(submitTime.diff(createdAt, 'seconds')).to.be.below(10);
            }
          });
        });

        return chakram.wait();
      });
  });

  it('should not accept measurements from hackair devices without access token', () => {
    return chakram.post(`${BASE_URL}/boxes/${hackair_home_v2_id}/data?hackair=true`, hackair_example_data)
      .then(function (response) {
        expect(response).to.have.status(401);
        expect(response.body).to.be.an('object');
        expect(response.body.message).to.be.a('string');
        expect(response.body.message).to.equal('Access token not valid!');
      });
  });
});
