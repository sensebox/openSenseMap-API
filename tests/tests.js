'use strict';

let chakram = require('chakram'),
  expect = chakram.expect,
  moment = require('moment');

const BASE_URL = 'http://localhost:8000',
  valid_sensebox = require('./data/valid_sensebox'),
  senseBoxSchema = require('./data/senseBoxSchema'),
  senseBoxCreateSchema = require('./data/senseBoxCreateSchema');

describe('openSenseMap API', function () {
  describe('/boxes', function () {

    it('should return an empty array', function () {
      const response = chakram.get(`${BASE_URL}/boxes`);
      expect(response).to.have.status(200);
      expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
      expect(response).to.comprise.of.json([]);

      return chakram.wait();
    });

    it('should return a geojson feature collection with ?format=geojson', function () {
      const response = chakram.get(`${BASE_URL}/boxes?format=geojson`);
      expect(response).to.have.status(200);
      expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
      expect(response).to.comprise.of.json({ 'type': 'FeatureCollection', 'features': [] });

      return chakram.wait();
    });

    it('should return 422 error on wrong format parameter', function () {
      const response = chakram.get(`${BASE_URL}/boxes?format=potato`);
      expect(response).to.have.status(422);
      expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

      return chakram.wait();
    });

    let boxId, apiKey, boxObj;

    it('should allow to create a senseBox via POST', function () {
      return chakram.post(`${BASE_URL}/boxes`, valid_sensebox)
        .then(function (response) {
          expect(response).to.have.status(201);
          expect(response).to.have.schema(senseBoxCreateSchema);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

          boxId = response.body.boxes[0];
          apiKey = response.body.apikey;

          return chakram.get(`${BASE_URL}/boxes/${boxId}`);
        })
        .then(function (response) {
          boxObj = response.body;
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response).to.have.schema(senseBoxSchema);

          expect(response).to.not.have.keys('mqtt');

          return chakram.wait();
        });
    });

    it('should let users validate their api-key', function () {
      return chakram.get(`${BASE_URL}/users/${boxId}`, { headers: { 'x-apikey': apiKey } })
        .then(function (response) {
          return expect(response).to.comprise.of.json({ 'code': 'Authorized', 'message': 'ApiKey is valid' });
        });
    });

    it('should deny access when apikey is missing', function () {
      return chakram.get(`${BASE_URL}/users/${boxId}`, {})
        .then(function (response) {
          return expect(response).to.have.status(403);
        });
    });

    it('should let users retrieve their box with all fields', function () {
      return chakram.get(`${BASE_URL}/users/${boxId}?returnBox=t`, { headers: { 'x-apikey': apiKey } })
        .then(function (response) {
          expect(response).to.have.schema(senseBoxSchema);
        });
    });

    it('should let users retrieve their arduino sketch', function () {
      return chakram.get(`${BASE_URL}/boxes/${boxId}/script`, { headers: { 'x-apikey': apiKey } })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body).not.to.be.empty;
        });
    });

    let countMeasurements = 0;

    it('should accept a single measurement via POST', function () {
      let submitTime;

      return chakram.post(`${BASE_URL}/boxes/${boxId}/${boxObj.sensors[0]._id}`, { 'value': 312.1 })
        .then(function (response) {
          submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
          expect(response).to.have.status(201);
          expect(response.body).to.equal('Measurement saved in box');

          return chakram.get(`${BASE_URL}/boxes/${boxId}`);
        })
        .then(function (response) {
          expect(response).to.have.json('sensors', function (sensors) {
            sensors.forEach(function (sensor) {
              if (sensor._id === boxObj.sensors[0]._id) {
                expect(sensor.lastMeasurement).not.to.be.null;
                expect(sensor.lastMeasurement.createdAt).to.exist;
                const createdAt = moment.utc(sensor.lastMeasurement.createdAt);
                expect(createdAt.diff(submitTime)).to.be.below(1000);
                expect(sensor.lastMeasurement.value).to.be.equal('312.1');
              }
            });
          });
          countMeasurements += 1;

          return chakram.wait();
        });
    });

    it('should accept a single measurement with timestamp via POST', function () {
      const submitTime = moment.utc().toISOString();

      return chakram.post(`${BASE_URL}/boxes/${boxId}/${boxObj.sensors[1]._id}`, { 'value': 123.4, 'createdAt': submitTime })
        .then(function (response) {
          expect(response).to.have.status(201);
          expect(response.body).to.equal('Measurement saved in box');

          return chakram.get(`${BASE_URL}/boxes/${boxId}`);
        })
        .then(function (response) {
          expect(response).to.have.json('sensors', function (sensors) {
            sensors.forEach(function (sensor) {
              if (sensor._id === boxObj.sensors[1]._id) {
                expect(sensor.lastMeasurement).not.to.be.null;
                expect(sensor.lastMeasurement.createdAt).to.exist;
                const createdAt = moment.utc(sensor.lastMeasurement.createdAt);
                expect(createdAt.diff(submitTime)).to.be.equal(0);
                expect(sensor.lastMeasurement.value).to.be.equal('123.4');
              }
            });
          });
          countMeasurements += 1;

          return chakram.wait();
        });
    });

    it('should reject a single measurement with timestamp too far into the future via POST', function () {
      const submitTime = moment.utc().add(1.5, 'minutes').toISOString();

      return chakram.post(`${BASE_URL}/boxes/${boxId}/${boxObj.sensors[1]._id}`, { 'value': 123.4, 'createdAt': submitTime })
        .then(function (response) {
          expect(response).to.have.status(422);

          return chakram.wait();
        });
    });

    const csv_example_data = require('./data/csv_example_data');

    it('should accept multiple measurements as csv via POST', function () {
      let submitTime;

      return chakram.post(`${BASE_URL}/boxes/${boxId}/data`, csv_example_data.no_timestamps(boxObj.sensors), { json: false, headers: { 'content-type': 'text/csv' } })
        .then(function (response) {
          submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
          expect(response).to.have.status(201);

          return chakram.get(`${BASE_URL}/boxes/${boxId}`);
        })
        .then(function (response) {
          expect(response).to.have.json('sensors', function (sensors) {
            sensors.forEach(function (sensor) {
              expect(sensor.lastMeasurement).not.to.be.null;
              expect(sensor.lastMeasurement.createdAt).to.exist;
              const createdAt = moment.utc(sensor.lastMeasurement.createdAt);
              expect(createdAt.diff(submitTime)).to.be.below(1000);
            });
          });
          countMeasurements += boxObj.sensors.length;

          return chakram.wait();
        });
    });

    it('should accept multiple measurements with timestamps as csv via POST', function () {
      let submitTime;

      return chakram.post(`${BASE_URL}/boxes/${boxId}/data`, csv_example_data.with_timestamps(boxObj.sensors), { json: false, headers: { 'content-type': 'text/csv' } })
        .then(function (response) {
          submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
          expect(response).to.have.status(201);

          return chakram.get(`${BASE_URL}/boxes/${boxId}`);
        })
        .then(function (response) {
          expect(response).to.have.json('sensors', function (sensors) {
            sensors.forEach(function (sensor) {
              expect(sensor.lastMeasurement).not.to.be.null;
              expect(sensor.lastMeasurement.createdAt).to.exist;
              const createdAt = moment.utc(sensor.lastMeasurement.createdAt);
              expect(submitTime.diff(createdAt, 'minutes')).to.be.below(4);
            });
          });
          countMeasurements += boxObj.sensors.length;

          return chakram.wait();
        });
    });

    it('should reject multiple measurements with timestamps too far into the future as csv via POST', function () {
      return chakram.post(`${BASE_URL}/boxes/${boxId}/data`, csv_example_data.with_timestamps_future(boxObj.sensors), { json: false, headers: { 'content-type': 'text/csv' } })
        .then(function (response) {
          expect(response).to.have.status(422);

          return chakram.wait();
        });
    });

    it('should reject multiple measurements with too many fields as csv via POST', function () {
      return chakram.post(`${BASE_URL}/boxes/${boxId}/data`, csv_example_data.with_too_many(boxObj.sensors), { json: false, headers: { 'content-type': 'text/csv' } })
        .then(function (response) {
          expect(response).to.have.status(422);

          return chakram.wait();
        });
    });

    const json_submit_data = require('./data/json_submit_data');

    it('should accept multiple measurements with timestamps as json object via POST', function () {
      let submitTime;

      return chakram.post(`${BASE_URL}/boxes/${boxId}/data`, json_submit_data.json_obj(boxObj.sensors))
        .then(function (response) {
          submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
          expect(response).to.have.status(201);
          expect(response.body).to.equal('Measurements saved in box');

          return chakram.get(`${BASE_URL}/boxes/${boxId}`);
        })
        .then(function (response) {
          expect(response).to.have.json('sensors', function (sensors) {
            sensors.forEach(function (sensor) {
              expect(sensor.lastMeasurement).not.to.be.null;
              expect(sensor.lastMeasurement.createdAt).to.exist;
              const createdAt = moment.utc(sensor.lastMeasurement.createdAt);
              expect(submitTime.diff(createdAt, 'minutes')).to.be.below(4);
            });
          });
          countMeasurements += boxObj.sensors.length;

          return chakram.wait();
        });
    });

    it('should accept multiple measurements with timestamps as json array via POST', function () {
      let submitTime;

      return chakram.post(`${BASE_URL}/boxes/${boxId}/data`, json_submit_data.json_arr(boxObj.sensors))
        .then(function (response) {
          submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
          expect(response).to.have.status(201);
          expect(response.body).to.equal('Measurements saved in box');

          return chakram.get(`${BASE_URL}/boxes/${boxId}`);
        })
        .then(function (response) {
          expect(response).to.have.json('sensors', function (sensors) {
            sensors.forEach(function (sensor) {
              expect(sensor.lastMeasurement).not.to.be.null;
              expect(sensor.lastMeasurement.createdAt).to.exist;
              const createdAt = moment.utc(sensor.lastMeasurement.createdAt);
              expect(submitTime.diff(createdAt, 'minutes')).to.be.below(4);
            });
          });
          countMeasurements += boxObj.sensors.length;

          return chakram.wait();
        });
    });

    it('should return /stats correctly', function () {
      return chakram.get(`${BASE_URL}/stats`)
        .then(function (response) {
          let [boxes, measurements] = response.body;
          expect(boxes).to.equal(1);
          expect(measurements).to.equal(countMeasurements);

          return chakram.wait();
        });
    });

    it('should allow download data through /boxes/:boxid/data/:sensorid', function () {
      return chakram.get(`${BASE_URL}/boxes/${boxId}/data/${boxObj.sensors[0]._id}`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(Array.isArray(response.body)).to.be.true;
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response.body.length).to.be.above(4);

          return chakram.wait();
        });
    });

    it('should allow download data through /boxes/:boxid/data/:sensorid as csv', function () {
      return chakram.get(`${BASE_URL}/boxes/${boxId}/data/${boxObj.sensors[1]._id}?format=csv`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body).not.to.be.empty;
          expect(response).to.have.header('content-type', 'text/csv');
          expect(response).to.have.header('Content-Disposition', `attachment; filename=${boxObj.sensors[1]._id}.csv`);

          return chakram.wait();
        });
    });

    it('should allow download data through /boxes/data/:sensorid as csv', function () {
      return chakram.get(`${BASE_URL}/boxes/data/?boxid=${boxId}&phenomenon=Temperatur`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body).not.to.be.empty;
          expect(response).to.have.header('content-type', 'text/csv');

          return chakram.wait();
        });
    });

    it('should allow to delete a senseBox via DELETE', function () {
      return chakram.delete(`${BASE_URL}/boxes/${boxId}`, {}, { headers: { 'x-apikey': apiKey } })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

          return chakram.get(`${BASE_URL}/boxes/${boxId}`);
        })
        .then(function (response) {
          expect(response).to.have.status(404);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        });
    });
  });

});
