'use strict';

/* global describe it before */

const chakram = require('chakram'),
  expect = chakram.expect,
  moment = require('moment');

const BASE_URL = process.env.OSEM_TEST_BASE_URL,
  findAllSchema = require('../data/findAllSchema'),
  measurementsSchema = require('../data/measurementsSchema');

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
        expect(response).to.have.schema(measurementsSchema);
        expect(response.body.every(function (measurement) {
          return expect(moment.utc(measurement.createdAt, moment.ISO_8601, true).isValid()).true;
        })).true;

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

  it('should allow download data through /boxes/data/?phenomenon&boxid as csv', function () {
    return chakram.get(`${BASE_URL}/boxes/data/?boxid=${boxIds[0]}&phenomenon=Temperatur`)
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response.body).not.to.be.empty;
        expect(response).to.have.header('content-type', 'text/csv');

        return chakram.wait();
      });
  });

  it('should allow download data via POST through /boxes/data/?phenomenon&boxid as csv', function () {
    return chakram.post(`${BASE_URL}/boxes/data`, { boxid: boxIds[0], phenomenon: 'Temperatur' })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response.body).not.to.be.empty;
        expect(response).to.have.header('content-type', 'text/csv');

        return chakram.wait();
      });
  });

  it('should return the data for /boxes/:boxId/data/:sensorId in descending order', function () {
    return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}/data/${boxes[0].sensors[1]._id}?from-date=2016-01-01T00:00:00Z&to-date=2016-01-31T23:59:59Z`)
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.have.schema(measurementsSchema);
        expect(response.body.every(function (measurement) {
          return expect(moment.utc(measurement.createdAt, moment.ISO_8601, true).isValid()).true;
        })).true;
        expect(response.body).not.to.be.empty;
        let isDescending = true;
        for (let i = 1; i < response.body.length - 1; i++) {
          if (new Date(response.body[i - 1].createdAt) - new Date(response.body[i].createdAt) < 0) {
            isDescending = false;
            break;
          }
        }

        expect(isDescending).true;

        return chakram.wait();
      });
  });

  it('should return the data for /boxes/:boxId/data/:sensorId in descending order', function () {
    return chakram.get(`${BASE_URL}/boxes/data/?boxid=${boxIds[0]}&phenomenon=rel. Luftfeuchte&from-date=2016-01-01T00:00:00Z&to-date=2016-01-31T23:59:59Z`)
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response.body).not.to.be.empty;
        expect(response).to.have.header('content-type', 'text/csv');
        let isDescending = true;
        const lines = response.body.split('\n');
        for (let i = 2; i < lines.length - 1; i++) {
          const [ createdAt ] = lines[i - 1].split(',');
          const [ createdAt2 ] = lines[i].split(',');
          if (new Date(createdAt) - new Date(createdAt2) < 0) {
            isDescending = false;
            break;
          }
        }

        expect(isDescending).true;

        return chakram.wait();
      });
  });

  it('should return an error /boxes/:boxId/data/:sensorId for invalid bbox parameter (too many values)', function () {
    return chakram.get(`${BASE_URL}/boxes/data/?boxid=${boxIds[0]}&phenomenon=Temperatur&bbox=1,2,3,4,5`)
      .then(function (response) {
        expect(response).to.have.status(422);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).json({ code: 'UnprocessableEntity', message: 'Illegal value for parameter bbox. Invalid number of coordinates.' });

        return chakram.wait();
      });
  });

  it('should return an error /boxes/:boxId/data/:sensorId for invalid bbox parameter (too few values)', function () {
    return chakram.get(`${BASE_URL}/boxes/data/?boxid=${boxIds[0]}&phenomenon=Temperatur&bbox=1,2,3`)
      .then(function (response) {
        expect(response).to.have.status(422);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).json({ code: 'UnprocessableEntity', message: 'Illegal value for parameter bbox. Invalid number of coordinates.' });

        return chakram.wait();
      });
  });

  it('should return an error /boxes/:boxId/data/:sensorId for invalid bbox parameter (not floats)', function () {
    return chakram.get(`${BASE_URL}/boxes/data/?boxid=${boxIds[0]}&phenomenon=Temperatur&bbox=1,2,east,4`)
      .then(function (response) {
        expect(response).to.have.status(422);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).json({ code: 'UnprocessableEntity', message: 'Illegal value for parameter bbox. Supplied values can not be parsed as floats.' });

        return chakram.wait();
      });
  });

  it('should return an error /boxes/:boxId/data/:sensorId for invalid bbox parameter (out of bounds)', function () {
    return chakram.get(`${BASE_URL}/boxes/data/?boxid=${boxIds[0]}&phenomenon=Temperatur&bbox=1,2,3,120`)
      .then(function (response) {
        expect(response).to.have.status(422);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).json({ code: 'UnprocessableEntity', message: 'Illegal value for parameter bbox. Supplied coordinates are outside of (180, 90, -180, 90).' });

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

  it('should return the correct count and correct schema of boxes for /boxes GET with date parameter', function () {
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

  it('should return the correct count and correct schema of boxes for /boxes GET with date parameter some time else', function () {
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

  it('should return the correct count and correct schema of boxes for /boxes GET with two date parameters', function () {
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
