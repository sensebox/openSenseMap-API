'use strict';

/* global describe it before */

const chakram = require('chakram'),
  expect = chakram.expect,
  moment = require('moment');

const BASE_URL = process.env.OSEM_TEST_BASE_URL;

describe('deleting sensor data', function () {
  let jwt;
  let boxes = [];
  let boxIds = [];

  before(function () {
    return chakram.post(`${BASE_URL}/users/sign-in`, { email: 'tester2@test.test', password: '12345678910' })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        expect(response.body.token).to.exist;

        jwt = response.body.token;

        return chakram.get(`${BASE_URL}/users/me/boxes`, { headers: { 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        boxIds = response.body.data.boxes.map(b => b._id);
        boxes = response.body.data.boxes;

        return chakram.wait();
      });
  });

  it('should allow to delete all data for a single sensor', function () {
    const tempsensor_id = boxes[1].sensors[boxes[1].sensors.findIndex(s => s.title === 'Temperatur')]._id;
    const payload = { 'deleteAllMeasurements': true };

    return chakram.get(`${BASE_URL}/boxes/${boxIds[1]}/sensors`)
      .then(function (response) {
        expect(response).to.have.json('sensors', function (sensors) {
          sensors.forEach(function (sensor) {
            expect(sensor.lastMeasurement).to.exist;
          });
        });

        return chakram.delete(`${BASE_URL}/boxes/${boxIds[1]}/${tempsensor_id}/measurements`, payload, { headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(200);

        return chakram.get(`${BASE_URL}/boxes/${boxIds[1]}/data/${tempsensor_id}`);
      })
      .then(function (response) {
        expect(Array.isArray(response.body)).to.be.true;
        expect(response.body.length).to.equal(0);

        return chakram.get(`${BASE_URL}/boxes/${boxIds[1]}`);
      })
      .then(function (response) {
        expect(response).to.have.json('sensors', function (sensors) {
          sensors.forEach(function (sensor) {
            if (sensor._id === tempsensor_id) {
              expect(sensor.lastMeasurement).not.to.exist;
            } else {
              expect(sensor.lastMeasurement).to.exist;
            }
          });
        });

        return chakram.wait();
      });
  });

  it('should allow to delete data for a single sensor through specifying timestamps', function () {
    let sensor_id;
    const payload = { timestamps: [] };

    return chakram.get(`${BASE_URL}/boxes/${boxIds[1]}/sensors`)
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response.body.sensors).to.not.be.empty;
        expect(Array.isArray(response.body.sensors)).to.be.true;
        const sensor = response.body.sensors.find(s => s.title === 'Windgeschwindigkeit');
        expect(sensor).to.not.be.undefined;
        expect(sensor.lastMeasurement).to.not.be.undefined;
        sensor_id = sensor._id;
        payload.timestamps.push(sensor.lastMeasurement.createdAt);

        return chakram.delete(`${BASE_URL}/boxes/${boxIds[1]}/${sensor_id}/measurements`, payload, { headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(200);

        return chakram.get(`${BASE_URL}/boxes/${boxIds[1]}/data/${sensor_id}`);
      })
      .then(function (response) {
        expect(Array.isArray(response.body)).to.be.true;
        expect(response.body).to.be.empty;

        return chakram.get(`${BASE_URL}/boxes/${boxIds[1]}`);
      })
      .then(function (response) {
        expect(response).to.have.json('sensors', function (sensors) {
          sensors.forEach(function (sensor) {
            if (sensor._id === sensor_id) {
              expect(sensor.lastMeasurement.createdAt).to.not.equal(payload.timestamps[0]);
            }
          });
        });

        return chakram.wait();
      });
  });

  it('should allow to delete all data for a single sensor through specifying from-date and to-date', function () {
    const sensor_id = boxes[1].sensors[boxes[1].sensors.findIndex(s => s.title === 'Luftdruck')]._id;
    const payload = { 'from-date': moment.utc().subtract(1, 'year')
      .toISOString(), 'to-date': moment.utc().toISOString() };

    return chakram.delete(`${BASE_URL}/boxes/${boxIds[1]}/${sensor_id}/measurements`, payload, { headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(200);

        return chakram.get(`${BASE_URL}/boxes/${boxIds[1]}/data/${sensor_id}`);
      })
      .then(function (response) {
        expect(Array.isArray(response.body)).to.be.true;
        expect(response.body.length).to.equal(0);

        return chakram.get(`${BASE_URL}/boxes/${boxIds[1]}`);
      })
      .then(function (response) {
        expect(response).to.have.json('sensors', function (sensors) {
          sensors.forEach(function (sensor) {
            if (sensor._id === sensor_id) {
              expect(sensor.lastMeasurement).not.to.exist;
            }
          });
        });

        return chakram.wait();
      });
  });

  it('should allow to delete some data for a single sensor through specifying from-date and to-date', function () {
    const sensor_id = boxes[1].sensors.find(s => s.title === 'Kurzwellige Strahlung')._id;
    let from, to;

    let measurementCountBefore;

    return chakram.get(`${BASE_URL}/boxes/${boxIds[1]}/data/${sensor_id}?from-date=${moment.utc().subtract(30, 'days')
      .toISOString()}&to-date=${moment.utc().toISOString()}`)
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response.body.length).not.equal(0);
        measurementCountBefore = response.body.length;

        from = moment.utc(response.body[3].createdAt).add(1, 'second')
          .toISOString();
        to = moment.utc(response.body[1].createdAt).subtract(1, 'second')
          .toISOString();

        return chakram.delete(`${BASE_URL}/boxes/${boxIds[1]}/${sensor_id}/measurements`, { 'from-date': from, 'to-date': to }, { headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(200);

        return chakram.get(`${BASE_URL}/boxes/${boxIds[1]}/data/${sensor_id}?from-date=${moment.utc().subtract(30, 'days')
          .toISOString()}&to-date=${moment.utc().toISOString()}`);
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response.body.length).not.equal(0);
        expect(response.body.length).below(measurementCountBefore);
      });
  });

  it('should deny to delete sensordata of boxes not owned by the user', function () {
    let otherJwt, otherBoxId, otherSensorId;

    return chakram.post(`${BASE_URL}/users/sign-in`, { name: 'mrtest2', email: 'tester3@test.test', password: '12345678' })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        expect(response.body.token).to.exist;

        otherJwt = response.body.token;

        return chakram.get(`${BASE_URL}/users/me/boxes`, { headers: { 'Authorization': `Bearer ${otherJwt}` } });
      })
      .then(function (response) {
        otherBoxId = response.body.data.boxes[0]._id;
        otherSensorId = response.body.data.boxes[0].sensors[0]._id;

        const payload = { 'from-date': moment.utc().subtract(1, 'year')
          .toISOString(), 'to-date': moment.utc().toISOString() };

        return chakram.delete(`${BASE_URL}/boxes/${otherBoxId}/${otherSensorId}/measurements`, payload, { headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(403);
        expect(response).to.have.json({ code: 'Forbidden', message: 'User does not own this senseBox' });
      });
  });

});
