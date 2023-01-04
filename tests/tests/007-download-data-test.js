'use strict';

/* global describe it before */

const chakram = require('chakram'),
  expect = chakram.expect,
  moment = require('moment');

const BASE_URL = process.env.OSEM_TEST_BASE_URL,
  findAllSchema = require('../data/findAllSchema'),
  findAllSchemaBoxes = require('../data/findAllSchemaBoxes'),
  measurementsSchema = require('../data/measurementsSchema'),
  getUserBoxesSchema = require('../data/getUserBoxesSchema'),
  boxSensorsSchema = require('../data/boxSensorsSchema'),
  sensorSchema = require('../data/sensorSchema');

describe('downloading data', function () {
  let jwt;
  let boxes = [];
  let boxIds = [];

  const boxCount = 4;

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

  it('should let users retrieve their box with last Measurements populated', function () {
    return chakram.get(`${BASE_URL}/users/me/boxes`, { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.schema(getUserBoxesSchema);
        expect(response).json('data.boxes', function (boxes) {
          expect(boxes.some(function ({ sensors }) {
            return expect(sensors.some(function (sensor) {
              return typeof sensor.lastMeasurement !== 'undefined' && sensor.lastMeasurement.createdAt && sensor.lastMeasurement.value;
            })).true;
          })).true;
        });

        return chakram.wait();
      });
  });

  describe('/boxes', function () {

    it('should return the correct count and correct schema of boxes for /boxes GET', function () {
      return chakram.get(`${BASE_URL}/boxes`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(Array.isArray(response.body)).to.be.true;
          expect(response.body.length).to.be.equal(boxCount);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response).to.have.schema(findAllSchemaBoxes);

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

  describe('/boxes/:boxid/sensors', function () {

    it('should return the sensors of a box for /boxes/:boxid/sensors GET', function () {
      return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}/sensors`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response).to.have.schema(boxSensorsSchema);

          return chakram.wait();
        });
    });

    it('should return a single sensor of a box for /boxes/:boxid/sensors/:sensorId GET', function () {
      return chakram.get(`${BASE_URL}/boxes/${boxes[0]._id}/sensors/${boxes[0].sensors[0]._id}`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response).to.have.schema(sensorSchema);

          return chakram.wait();
        });
    });

    it('should return only value of a single sensor of a box for /boxes/:boxid/sensors/:sensorId?onlyValue=true GET', function () {
      return chakram.get(`${BASE_URL}/boxes/${boxes[0]._id}/sensors/${boxes[0].sensors[0]._id}?onlyValue=true`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(parseFloat(response.body)).to.be.a('number');

          return chakram.wait();
        });
    });


  });

  describe('/boxes/:boxid/data/:sensorid', function () {

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
      return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}/data/${boxes[0].sensors[1]._id}?format=csv&download=true`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body).not.to.be.empty;
          expect(response).to.have.header('content-type', 'text/csv');
          expect(response).to.have.header('Content-Disposition', `attachment; filename=${boxes[0].sensors[1]._id}.csv`);

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

    it('should allow timestamps in the future for data retrieval', function () {
      const now = moment.utc();

      return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}/data/${boxes[0].sensors[1]._id}?from-date=${now.add(10, 'days').toISOString()}&to-date=${now.add(14, 'days').toISOString()}`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response.body).to.be.empty;

          return chakram.wait();
        });
    });

    it('should allow to compute outliers in measurements and mark them', function () {
      return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}/data/${boxes[0].sensors[1]._id}?outliers=mark`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response.body).not.lengthOf(0);
          expect(response).json(function (measurementsArray) {
            for (const measurement of measurementsArray) {
              expect(measurement).keys('isOutlier', 'createdAt', 'value', 'location');
              expect(typeof measurement.isOutlier).equal('boolean');
            }
          });

          return chakram.wait();
        });
    });

    it('should allow to compute outliers in measurements and replace them', function () {
      return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}/data/${boxes[0].sensors[1]._id}?outliers=replace`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response.body).not.lengthOf(0);
          expect(response).json(function (measurementsArray) {
            for (const measurement of measurementsArray) {
              expect(measurement).keys('isOutlier', 'createdAt', 'value', 'location');
              expect(typeof measurement.isOutlier).equal('boolean');
            }
          });

          return chakram.wait();
        });
    });

  });

  describe('/boxes/data', function () {

    const expectedMeasurementsCount = 10;

    it('should allow download data through /boxes/data/?phenomenon&boxid as csv', function () {
      return chakram.get(`${BASE_URL}/boxes/data/?boxid=${boxIds[0]}&phenomenon=Temperatur`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body).not.to.be.empty;
          expect(response).to.have.header('content-type', 'text/csv');

          return chakram.wait();
        });
    });

    it('should allow download data through /boxes/data/?phenomenon&boxid as csv with explicit parameter format=csv', function () {
      return chakram.get(`${BASE_URL}/boxes/data/?boxid=${boxIds[0]}&phenomenon=Temperatur&format=csv`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body).not.to.be.empty;
          expect(response).to.have.header('content-type', 'text/csv');

          return chakram.wait();
        });
    });

    it('should allow download data through /boxes/data/?phenomenon&boxid as json', function () {
      return chakram.get(`${BASE_URL}/boxes/data/?boxid=${boxIds[0]}&phenomenon=Temperatur&format=json&columns=sensorId,value,lat,lon,height`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body).not.to.be.empty;
          expect(response).to.have.header('content-type', 'application/json');
          expect(Array.isArray(response.body)).true;
          for (const m of response.body) {
            expect(m.sensorId).to.exist;
            expect(m.value).to.exist;
            expect(m.lat).to.exist;
            expect(m.lon).to.exist;
          }

          return chakram.wait();
        });
    });

    it('should allow download data through /boxes/data/?phenomenon&boxid as csv with multiple boxids', function () {
      return chakram.get(`${BASE_URL}/boxes/data/?boxid=${boxIds[0]},${boxIds[1]}&phenomenon=Temperatur`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body).not.to.be.empty;
          expect(response).to.have.header('content-type', 'text/csv');
          /* eslint-disable no-unused-vars */
          const [_, ...lines] = response.body.split('\n');
          /* eslint-enable no-unused-vars */
          expect(lines).to.have.lengthOf(expectedMeasurementsCount);

          return chakram.wait();
        });
    });

    it('should allow download data via POST through /boxes/data/?phenomenon&boxid as csv', function () {
      return chakram.post(`${BASE_URL}/boxes/data`, { boxid: boxIds[0], phenomenon: 'Temperatur' })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body).not.to.be.empty;
          expect(response).to.have.header('content-type', 'text/csv');
          /* eslint-disable no-unused-vars */
          const [_, ...lines] = response.body.split('\n');
          /* eslint-enable no-unused-vars */
          expect(lines).to.have.lengthOf(expectedMeasurementsCount);

          return chakram.wait();
        });
    });

    it('should allow to download csv from boxes with specified exposure', function () {
      const exposureFromDate = moment.utc().subtract(100, 'days')
        .toISOString();
      const exposureToDate = moment.utc()
        .toISOString();

      return chakram.get(`${BASE_URL}/boxes/data/?bbox=-180,-90,180,90&phenomenon=Temperatur&exposure=indoor&columns=exposure&from-date=${exposureFromDate}&to-date=${exposureToDate}`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body).not.to.be.empty;
          expect(response).to.have.header('content-type', 'text/csv');
          const [header, ...lines] = response.body.split('\n');
          expect(header).equal('exposure');
          expect(lines).to.have.lengthOf(expectedMeasurementsCount);
          for (let i = 0; i < lines.length - 1; i++) {
            expect(lines[i]).equal('indoor');
          }

          return chakram.wait();
        });
    });

    it('should allow to download csv from boxes with multiple exposures', function () {
      const exposureFromDate = moment.utc().subtract(100, 'days')
        .toISOString();
      const exposureToDate = moment.utc()
        .toISOString();

      return chakram.get(`${BASE_URL}/boxes/data/?bbox=-180,-90,180,90&phenomenon=Temperatur&exposure=indoor,outdoor&columns=exposure&from-date=${exposureFromDate}&to-date=${exposureToDate}`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body).not.to.be.empty;
          expect(response).to.have.header('content-type', 'text/csv');
          const [header, ...lines] = response.body.split('\n');
          expect(header).equal('exposure');
          expect(lines).to.have.lengthOf(expectedMeasurementsCount + 5);
          let hasIndoor = false, hasOutdoor = false;
          for (let i = 0; i < lines.length - 1; i++) {
            if (hasIndoor === false && lines[i] === 'indoor') {
              hasIndoor = true;
            }
            if (hasOutdoor === false && lines[i] === 'outdoor') {
              hasOutdoor = true;
            }
          }
          expect(hasOutdoor).true;
          expect(hasIndoor).true;

          return chakram.wait();
        });
    });

    it('should have the content-disposition header when calling /boxes/data/', function () {
      return chakram.get(`${BASE_URL}/boxes/data/?boxid=${boxIds[0]},${boxIds[1]}&phenomenon=Temperatur`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body).not.to.be.empty;
          expect(response).to.have.header('content-type', 'text/csv');
          expect(response).to.have.header('content-disposition', /opensensemap_org-download-Temperatur-sensorId-createdAt-value-lat-lon-/);
          /* eslint-disable no-unused-vars */
          const [_, ...lines] = response.body.split('\n');
          /* eslint-enable no-unused-vars */
          expect(lines).to.have.lengthOf(expectedMeasurementsCount);

          return chakram.wait();
        });
    });

    it('should not have the content-disposition header when calling /boxes/data/?download=false', function () {
      return chakram.get(`${BASE_URL}/boxes/data/?boxid=${boxIds[0]},${boxIds[1]}&phenomenon=Temperatur&download=false`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body).not.to.be.empty;
          expect(response).to.have.header('content-type', 'text/csv');
          expect(response).to.not.have.header('content-disposition', /opensensemap_org-download-Temperatur-createdAt-value-lat-lon-/);
          /* eslint-disable no-unused-vars */
          const [_, ...lines] = response.body.split('\n');
          /* eslint-enable no-unused-vars */
          expect(lines).to.have.lengthOf(expectedMeasurementsCount);

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
            const [createdAt] = lines[i - 1].split(',');
            const [createdAt2] = lines[i].split(',');
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
          expect(response).json({ code: 'UnprocessableEntity', message: 'Illegal value for parameter bbox. Supplied coordinates are outside of -180, -90, 180, 90 (lngSW, latSW, lngNE, latNE).' });

          return chakram.wait();
        });
    });

    it('should return an error /boxes/:boxId/data/:sensorId for invalid bbox parameter (area is zero)', function () {
      return chakram.get(`${BASE_URL}/boxes/data/?phenomenon=Temperatur&bbox=-180,90,180,90`)
        .then(function (response) {
          expect(response).to.have.status(422);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response).json({ code: 'UnprocessableEntity', message: 'Illegal value for parameter bbox. Supplied bounding box has zero surface area.' });

          return chakram.wait();
        });
    });
    it('should allow to specify bounding boxes with area greater than a single hemisphere', function () {
      return chakram.get(`${BASE_URL}/boxes/data/?phenomenon=Temperatur&bbox=-180,-90,180,90`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'text/csv');

          const data = response.body.split('\n');
          expect(data.length).above(1);

          return chakram.wait();
        });
    });

  });

  describe('/boxes/data/bytag?grouptag=newgroup', function () {

    const expectedMeasurementsCount = 40;

    it('should allow download data by Grouptag /boxes/data/bytag=newgroup as json', function () {
      return chakram.get(`${BASE_URL}/boxes/data/bytag?grouptag=newgroup`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body.length).to.be.equal(expectedMeasurementsCount);
          expect(response).to.have.header('content-type', 'application/json');

          return chakram.wait();
        });
    });
  })

});
