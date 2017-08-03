'use strict';

/* global describe it before */

const chakram = require('chakram'),
  expect = chakram.expect,
  moment = require('moment');

process.env.OSEM_TEST_BASE_URL = 'http://localhost:8000';

const BASE_URL = process.env.OSEM_TEST_BASE_URL,
  findAllSchema = require('../data/findAllSchema');

describe('downloading data', function () {
  let jwt;
  let boxes = [];
  let boxIds = [];

  const boxCount = 3;

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

  it('should allow download data through /boxes/:boxid/data/:sensorid', function () {
    return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}/data/${boxes[0].sensors[0]._id}`)
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(Array.isArray(response.body)).to.be.true;
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response.body.length).to.be.above(4);

        return chakram.wait();
      });
  });

  it('should allow download data through /boxes/:boxid/data/:sensorid as csv', function () {
    return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}/data/${boxes[0].sensors[1]._id}?format=csv`)
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response.body).not.to.be.empty;
        expect(response).to.have.header('content-type', 'text/csv');
        expect(response).to.have.header('Content-Disposition', `attachment; filename=${boxes[0].sensors[1]._id}.csv`);

        return chakram.wait();
      });
  });

  it('should allow download data through /boxes/data/:sensorid as csv', function () {
    return chakram.get(`${BASE_URL}/boxes/data/?boxid=${boxIds[0]}&phenomenon=Temperatur`)
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response.body).not.to.be.empty;
        expect(response).to.have.header('content-type', 'text/csv');

        return chakram.wait();
      });
  });

  it('should allow download data via POST through /boxes/data/:sensorid as csv', function () {
    return chakram.post(`${BASE_URL}/boxes/data`, { boxid: boxIds[0], phenomenon: 'Temperatur' })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response.body).not.to.be.empty;
        expect(response).to.have.header('content-type', 'text/csv');

        return chakram.wait();
      });
  });

  it('should return the correct count and correct schema of boxes for /boxes GET', function () {
    return chakram.get(`${BASE_URL}/boxes`)
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(Array.isArray(response.body)).to.be.true;
        expect(response.body.length).to.be.equal(boxCount);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.have.schema(findAllSchema);

        return chakram.wait();
      });
  });

  it('should return the correct count and correct schema of boxes for /boxes GET with date parameter', function () {
    const ten_days_ago = moment.utc().subtract(10, 'days');

    return chakram.get(`${BASE_URL}/boxes?date=${ten_days_ago.toISOString()}`)
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(Array.isArray(response.body)).to.be.true;
        expect(response.body.length).to.be.equal(1);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.have.schema(findAllSchema);
        expect(response.body[0].sensors.some(function (sensor) {
          return moment.utc(sensor.lastMeasurement.createdAt).diff(ten_days_ago) < 10;
        })).to.be.true;

        return chakram.wait();
      });
  });

  it('should return the correct count and correct schema of boxes for /boxes GET with date parameter outside of data range', function () {
    const eleven_days_ago = moment.utc().subtract(11, 'days');

    return chakram.get(`${BASE_URL}/boxes?date=${eleven_days_ago.toISOString()}`)
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(Array.isArray(response.body)).to.be.true;
        expect(response.body.length).to.be.equal(0);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.have.schema(findAllSchema);

        return chakram.wait();
      });
  });

  it('should return the correct count and correct schema of boxes for /boxes GET with two date parameters', function () {
    const now = moment.utc();

    return chakram.get(`${BASE_URL}/boxes?date=${now.clone().subtract(1, 'minute')
      .toISOString()},${now.toISOString()}`)
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(Array.isArray(response.body)).to.be.true;
        expect(response.body.length).to.be.equal(1);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.have.schema(findAllSchema);

        return chakram.get(`${BASE_URL}/boxes?date=${now.clone().subtract(10, 'days')
          .subtract(10, 'minutes')
          .toISOString()},${now.toISOString()}`);
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(Array.isArray(response.body)).to.be.true;
        expect(response.body.length).to.be.equal(2);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.have.schema(findAllSchema);

        return chakram.wait();
      });
  });

  it('should return the correct count and correct schema of boxes for /boxes GET with date parameter after deleted sensor', function () {
    const now = moment.utc();

    return chakram.get(`${BASE_URL}/boxes?date=${now.toISOString()}&phenomenon=Temperatur`)
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(Array.isArray(response.body)).to.be.true;
        expect(response.body.length).to.be.equal(1);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.have.schema(findAllSchema);

        return chakram.wait();
      });
  });

  it('should return the correct count and correct schema of boxes for /boxes GET with date parameter after deleted sensor #2', function () {
    const ten_days_ago = moment.utc().subtract(10, 'days');

    return chakram.get(`${BASE_URL}/boxes?date=${ten_days_ago.toISOString()}&phenomenon=Luftdruck`)
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(Array.isArray(response.body)).to.be.true;
        expect(response.body.length).to.be.equal(1);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.have.schema(findAllSchema);

        return chakram.wait();
      });
  });

  it('should return the correct count and correct schema of boxes for /boxes GET with two date parameters after deleted sensor', function () {
    const now = moment.utc();

    return chakram.get(`${BASE_URL}/boxes?date=${now.clone().subtract(5, 'minutes')
      .toISOString()},${now.toISOString()}&phenomenon=Temperatur`)
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(Array.isArray(response.body)).to.be.true;
        expect(response.body.length).to.be.equal(1);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.have.schema(findAllSchema);

        return chakram.wait();
      });
  });
});
