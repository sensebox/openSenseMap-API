'use strict';

/* global describe it before */

const chakram = require('chakram'),
  expect = chakram.expect,
  moment = require('moment');

process.env.OSEM_TEST_BASE_URL = 'http://localhost:8000';

const BASE_URL = process.env.OSEM_TEST_BASE_URL,
  valid_sensebox = require('./data/valid_sensebox'),
  valid_user = require('./data/valid_user'),
  senseBoxSchema = require('./data/senseBoxSchema'),
  findAllSchema = require('./data/findAllSchema'),
  csv_example_data = require('./data/csv_example_data'),
  json_submit_data = require('./data/json_submit_data'),
  byte_submit_data = require('./data/byte_submit_data'),
  getUserBoxesSchema = require('./data/getUserBoxesSchema'),
  publishMqttMessage = require('./helpers/mqtt'),
  custom_valid_sensebox = require('./data/custom_valid_sensebox');

const path = require('path').join(__dirname, 'routes');

require('fs')
  .readdirSync(path)
  .forEach(function (file) {
    /* eslint-disable global-require */
    require(`${path}/${file}`);
    /* eslint-enable global-require */
  });

describe('openSenseMap API', function () {
  let jwt, jwt2;

  before(function () {
    return Promise.all([
      chakram.post(`${BASE_URL}/users/sign-in`, valid_user),
      chakram.post(`${BASE_URL}/users/sign-in`, { email: 'tester2@test.test', password: '12345678910' })
    ])
      .then(function ([response1, response2]) {
        expect(response1).to.have.status(200);
        expect(response1).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response1.body.token).to.exist;
        expect(response2).to.have.status(200);
        expect(response2).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response2.body.token).to.exist;

        jwt = response1.body.token;
        jwt2 = response2.body.token;

        return chakram.wait();
      });
  });

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

    let boxId, boxObj;
    const boxes = {};
    const boxIds = [];
    let boxCount = 0;

    it('should return /stats correctly', function () {
      return chakram.get(`${BASE_URL}/stats`)
        .then(function (response) {
          const [boxes, measurements] = response.body;
          expect(boxes).to.equal(boxCount);
          expect(measurements).to.equal(countMeasurements);

          return chakram.wait();
        });
    });

    it('should allow to create a senseBox via POST', function () {
      return chakram.post(`${BASE_URL}/boxes`, valid_sensebox(), { headers: { 'Authorization': `Bearer ${jwt}` } })
        .then(function (response) {
          expect(response).to.have.status(201);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

          boxId = response.body.data._id;
          boxCount = boxCount + 1;
          boxIds.push(boxId);

          return chakram.get(`${BASE_URL}/boxes/${boxId}`);
        })
        .then(function (response) {
          boxObj = response.body;
          boxes[boxId] = boxObj;
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response).to.have.schema(senseBoxSchema);
          expect(response).to.have.json('weblink', 'https://api.opensensemap.org');

          expect(response.body).to.not.have.keys('integrations');

          return chakram.wait();
        });
    });

    it('should return /stats correctly', function () {
      return chakram.get(`${BASE_URL}/stats`)
        .then(function (response) {
          const [boxes, measurements] = response.body;
          expect(boxes).to.equal(boxCount);
          expect(measurements).to.equal(countMeasurements);

          return chakram.wait();
        });
    });

    it('should allow to create a second senseBox via POST', function () {

      return chakram.post(`${BASE_URL}/boxes`, valid_sensebox(), { headers: { 'Authorization': `Bearer ${jwt2}` } })
        .then(function (response) {
          expect(response).to.have.status(201);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

          boxCount = boxCount + 1;
          boxIds.push(response.body.data._id);

          return chakram.get(`${BASE_URL}/boxes/${response.body.data._id}`);
        })
        .then(function (response) {
          boxes[response.body._id] = response.body;
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response).to.have.schema(senseBoxSchema);

          expect(response.body).to.not.have.keys('integrations');

          return chakram.wait();
        });
    });

    it('should allow to register a third box via POST', function () {
      return chakram.post(`${BASE_URL}/users/register`, { name: 'mrtest2', email: 'tester3@test.test', password: '12345678' })
        .then(function (response) {
          expect(response).to.have.status(201);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response.body.token).to.exist;

          const token = response.body.token;

          return chakram.post(`${BASE_URL}/boxes`, valid_sensebox(), { headers: { 'Authorization': `Bearer ${token}` } });
        })
        .then(function (response) {
          expect(response).to.have.status(201);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

          boxCount = boxCount + 1;
          //boxIds.push(response.body.data._id);

          return chakram.get(`${BASE_URL}/boxes/${response.body.data._id}`);
        })
        .then(function (response) {
          boxes[response.body._id] = response.body;
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response).to.have.schema(senseBoxSchema);

          expect(response.body).to.not.have.keys('integrations');

          return chakram.wait();
        });
    });

    it('should let users retrieve their box with all fields', function () {
      return chakram.get(`${BASE_URL}/users/me/boxes`, { headers: { 'Authorization': `Bearer ${jwt}` } })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.schema(getUserBoxesSchema);
          expect(response).to.comprise.of.json('data.boxes.0.integrations.mqtt', { enabled: false });

          return chakram.wait();
        });
    });

    it('should let users retrieve their arduino sketch', function () {
      return chakram.get(`${BASE_URL}/boxes/${boxId}/script`, { headers: { 'Authorization': `Bearer ${jwt}` } })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body).not.to.be.empty;

          return chakram.wait();
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
          countMeasurements = countMeasurements + 1;

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
          countMeasurements = countMeasurements + 1;

          return chakram.wait();
        });
    });

    it('should reject a single measurement with timestamp too far into the future via POST', function () {
      const submitTime = moment.utc().add(1.5, 'minutes')
        .toISOString();

      return chakram.post(`${BASE_URL}/boxes/${boxId}/${boxObj.sensors[1]._id}`, { 'value': 123.4, 'createdAt': submitTime })
        .then(function (response) {
          expect(response).to.have.status(422);

          return chakram.wait();
        });
    });


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
          countMeasurements = countMeasurements + boxObj.sensors.length;

          return chakram.wait();
        });
    });

    it('should deny to register a senseBox without model or sensors', function () {
      const box = { 'name': 'Wetterstation der AG Klimatologie Uni Münster', 'boxType': 'fixed', 'exposure': 'outdoor', 'loc': [{ 'type': 'feature', 'geometry': { 'type': 'Point', 'coordinates': [7.595878, 51.969263] } }] };

      return chakram.post(`${BASE_URL}/boxes`, box, { headers: { 'Authorization': `Bearer ${jwt2}` } })
        .then(function (response) {
          expect(response).to.have.status(422);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response).json({ code: 'UnprocessableEntityError', message: 'sensors are required if model is invalid or missing.' });

          return chakram.wait();
        });
    });

    it('should reject to register a senseBox with both model and sensors', function () {
      const box = { 'name': 'Wetterstation der AG Klimatologie Uni Münster', 'boxType': 'fixed', 'exposure': 'outdoor', 'loc': [{ 'type': 'feature', 'geometry': { 'type': 'Point', 'coordinates': [7.595878, 51.969263] } }], model: 'homeWifi', sensors: [{ title: 'Temp', unit: 'C', }] };

      return chakram.post(`${BASE_URL}/boxes`, box, { headers: { 'Authorization': `Bearer ${jwt2}` } })
        .then(function (response) {
          expect(response).to.have.status(422);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response).json({ code: 'UnprocessableEntityError', message: 'Parameters model and sensors cannot be specified at the same time.' });

          return chakram.wait();
        });
    });
    let custombox_id;

    it('should allow to register a custom senseBox', function () {
      return chakram.post(`${BASE_URL}/boxes`, custom_valid_sensebox, { headers: { 'Authorization': `Bearer ${jwt2}` } })
        .then(function (response) {
          expect(response).to.have.status(201);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

          boxCount = boxCount + 1;
          boxIds.push(response.body.data._id);
          custombox_id = response.body.data._id;

          return chakram.get(`${BASE_URL}/boxes/${response.body.data._id}`);
        })
        .then(function (response) {
          boxes[response.body._id] = response.body;
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response).to.have.schema(senseBoxSchema);

          expect(response.body).to.not.have.keys('integrations');

          return chakram.wait();
        });
    });


    it('should allow to create new sensors via PUT', function () {
      return chakram.put(`${BASE_URL}/boxes/${custombox_id}`, { 'sensors': [{ 'title': 'PM10', 'unit': 'µg/m³', 'sensorType': 'SDS 011', 'edited': 'true', 'new': 'true' }, { 'title': 'PM2.5', 'unit': 'µg/m³', 'sensorType': 'SDS 011', 'edited': 'true', 'new': 'true' }] }, { headers: { 'Authorization': `Bearer ${jwt2}` } })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.json('data.sensors', function (sensors) {
            let hasPM25 = false,
              hasPM10 = false;

            for (const sensor of sensors) {
              if (hasPM10 && hasPM25) {
                break;
              }
              hasPM10 = hasPM10 || sensor.title === 'PM10';
              hasPM25 = hasPM25 || sensor.title === 'PM2.5';
            }

            expect(hasPM10).to.be.true;
            expect(hasPM25).to.be.true;
          });

          return chakram.get(`${BASE_URL}/boxes/${custombox_id}`);
        })
        .then(function (response) {
          expect(response).to.have.json('sensors', function (sensors) {
            let hasPM25 = false,
              hasPM10 = false;

            for (const sensor of sensors) {
              if (hasPM10 && hasPM25) {
                break;
              }
              hasPM10 = hasPM10 || sensor.title === 'PM10';
              hasPM25 = hasPM25 || sensor.title === 'PM2.5';
            }

            expect(hasPM10).to.be.true;
            expect(hasPM25).to.be.true;
          });

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
              expect(submitTime.diff(createdAt, 'minutes')).to.be.below(5);
            });
          });
          countMeasurements = countMeasurements + boxObj.sensors.length;

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
          countMeasurements = countMeasurements + boxObj.sensors.length;

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
          countMeasurements = countMeasurements + boxObj.sensors.length;

          return chakram.wait();
        });
    });

    it('should accept multiple measurements as bytes via POST', function () {
      let submitTime;

      return chakram.post(`${BASE_URL}/boxes/${boxId}/data`, byte_submit_data(boxObj.sensors), { json: false, headers: { 'content-type': 'application/sbx-bytes' } })
        .then(function (response) {
          submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
          expect(response).to.have.status(201);
          expect(response.body).to.equal('"Measurements saved in box"');

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
          countMeasurements = countMeasurements + boxObj.sensors.length;

          return chakram.wait();
        });
    });

    it('should accept multiple measurements as bytes with timestamp via POST', function () {
      let submitTime;

      return chakram.post(`${BASE_URL}/boxes/${boxId}/data`, byte_submit_data(boxObj.sensors, true), { json: false, headers: { 'content-type': 'application/sbx-bytes-ts' } })
        .then(function (response) {
          submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
          expect(response).to.have.status(201);
          expect(response.body).to.equal('"Measurements saved in box"');

          return chakram.get(`${BASE_URL}/boxes/${boxId}`);
        })
        .then(function (response) {
          expect(response).to.have.json('sensors', function (sensors) {
            sensors.forEach(function (sensor) {
              expect(sensor.lastMeasurement).not.to.be.null;
              expect(sensor.lastMeasurement.createdAt).to.exist;
              const createdAt = moment.utc(sensor.lastMeasurement.createdAt);
              expect(submitTime.diff(createdAt, 'minutes')).to.be.below(5);
            });
          });
          countMeasurements = countMeasurements + boxObj.sensors.length;

          return chakram.wait();
        });
    });

    it('should return /stats correctly', function () {
      return chakram.get(`${BASE_URL}/stats`, { headers: { 'x-apicache-bypass': true } })
        .then(function (response) {
          const [boxes, measurements] = response.body;
          expect(boxes).to.equal(boxCount);
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

    it('should allow download data via POST through /boxes/data/:sensorid as csv', function () {
      return chakram.post(`${BASE_URL}/boxes/data`, { boxid: boxId, phenomenon: 'Temperatur' })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body).not.to.be.empty;
          expect(response).to.have.header('content-type', 'text/csv');

          return chakram.wait();
        });
    });

    it('should multiple csv measurements', function () {
      const boxId = boxIds[1];

      return chakram.post(`${BASE_URL}/boxes/${boxId}/data`, csv_example_data.ten_days_ago_many(boxes[boxId].sensors), { json: false, headers: { 'content-type': 'text/csv' } })
        .then(function (response) {
          expect(response).to.have.status(201);

          return chakram.get(`${BASE_URL}/boxes/${boxId}`);
        })
        .then(function (response) {
          expect(response).to.have.json('sensors', function (sensors) {
            sensors.forEach(function (sensor) {
              expect(sensor.lastMeasurement).not.to.be.null;
              expect(sensor.lastMeasurement.createdAt).to.exist;
            });
          });

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

    it('should allow to delete a single sensor via PUT', function () {
      const tempsensor_id = boxObj.sensors[boxObj.sensors.findIndex(s => s.title === 'Temperatur')]._id;
      const delete_payload = { sensors: [{ deleted: true, _id: tempsensor_id }] };

      return chakram.put(`${BASE_URL}/boxes/${boxId}`, delete_payload, { headers: { 'Authorization': `Bearer ${jwt}` } })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body.data.sensors.length).to.be.equal(4);

          return chakram.get(`${BASE_URL}/boxes/${boxId}`);
        })
        .then(function (response) {
          expect(response.body.sensors.length).to.be.equal(4);

          return chakram.wait();
        });
    });

    it('should allow to delete a single sensor via PUT of another box', function () {
      const pressuresensor_index = boxes[boxIds[1]].sensors.findIndex(s => s.title === 'Luftdruck');
      const pressuresensor_id = boxes[boxIds[1]].sensors[pressuresensor_index]._id;
      const delete_payload = { sensors: [{ deleted: true, _id: pressuresensor_id }] };

      return chakram.put(`${BASE_URL}/boxes/${boxIds[1]}`, delete_payload, { headers: { 'Authorization': `Bearer ${jwt2}` } })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body.data.sensors.length).to.be.equal(4);

          return chakram.get(`${BASE_URL}/boxes/${boxIds[1]}`);
        })
        .then(function (response) {
          expect(response.body.sensors.length).to.be.equal(4);
          boxes[boxIds[1]].sensors.splice(pressuresensor_index, 1);

          return chakram.wait();
        });
    });

    it('should return the correct count and correct schema of boxes for /boxes GET with date parameter after deleted sensor', function () {
      const now = moment.utc();

      return chakram.get(`${BASE_URL}/boxes?date=${now.toISOString()}&phenomenon=Temperatur`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(Array.isArray(response.body)).to.be.true;
          expect(response.body.length).to.be.equal(0);
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
          expect(response.body.length).to.be.equal(0);
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
          expect(response.body.length).to.be.equal(0);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response).to.have.schema(findAllSchema);

          return chakram.wait();
        });
    });

    it('should allow to delete a senseBox via DELETE', function () {
      return chakram.delete(`${BASE_URL}/boxes/${boxId}`, { password: valid_user.password }, { headers: { 'Authorization': `Bearer ${jwt}` } })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          boxCount = boxCount - 1;

          return chakram.get(`${BASE_URL}/boxes/${boxId}`);
        })
        .then(function (response) {
          expect(response).to.have.status(404);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

          return chakram.get(`${BASE_URL}/stats`);
        })
        .then(function (response) {
          const [boxes] = response.body;
          expect(boxes).to.equal(boxCount);

          return chakram.wait();
        });
    });

    it('should allow to configure TTN via PUT', function () {
      const update_payload = {
        ttn: {
          app_id: 'myapp',
          dev_id: 'mydevice',
          profile: 'debug',
          decodeOptions: [2, 2, 1, 1]
        }
      };

      return chakram.put(`${BASE_URL}/boxes/${boxIds[1]}`, update_payload, { headers: { 'Authorization': `Bearer ${jwt2}` } })
        .then(function (response) {
          expect(response).to.have.status(200);

          return chakram.wait();
        });
    });

    it('should reject invalid TTN configuration', function () {
      const update_payload = {
        ttn: {
          app_id: 'myapp',
          dev_id: 'mydevice',
          profile: 'lora-serialization',
          decodeOptions: null
        }
      };

      return chakram.put(`${BASE_URL}/boxes/${boxIds[1]}`, update_payload, { headers: { 'Authorization': `Bearer ${jwt2}` } })
        .then(function (response) {
          expect(response).to.have.status(422);
          expect(response.body.message).to.equal('validation failed: this profile requires an array \'decodeOptions\'');

          return chakram.wait();
        });
    });

    it('should allow to enable mqtt via PUT', function () {
      const update_payload = { mqtt: { enabled: true, url: 'mqtt://mosquitto', topic: 'mytopic', messageFormat: 'json', decodeOptions: '{}', connectionOptions: '{}' } };

      return chakram.put(`${BASE_URL}/boxes/${boxIds[1]}`, update_payload, { headers: { 'Authorization': `Bearer ${jwt2}` } })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.comprise.of.json('data.integrations.mqtt', { enabled: true });

          return chakram.get(`${BASE_URL}/users/me/boxes`, { headers: { 'Authorization': `Bearer ${jwt2}` } });
        })
        .then(function (response) {
          expect(response).to.have.schema(getUserBoxesSchema);
          // for some reason the second created box is returned first..?
          expect(response).to.comprise.of.json('data.boxes.0.integrations.mqtt', { enabled: true });

          return chakram.wait();
        });
    });

    it('should allow to update the box via PUT', function () {
      const update_payload = { name: 'neuername', exposure: 'indoor', grouptag: 'newgroup', description: 'total neue beschreibung', loc: { lat: 54.2, lng: 21.1 }, weblink: 'http://www.google.de', image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=' };

      return chakram.put(`${BASE_URL}/boxes/${boxIds[1]}`, update_payload, { headers: { 'Authorization': `Bearer ${jwt2}` } })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.comprise.of.json('data.name', update_payload.name);
          expect(response).to.comprise.of.json('data.exposure', update_payload.exposure);
          expect(response).to.comprise.of.json('data.grouptag', update_payload.grouptag);
          expect(response).to.comprise.of.json('data.description', update_payload.description);
          expect(response).to.comprise.of.json('data.weblink', update_payload.weblink);
          expect(response).to.comprise.of.json('data.loc', [ { type: 'Feature', geometry: { type: 'Point', coordinates: [ update_payload.loc.lng, update_payload.loc.lat ] } }]);

          expect(response).to.comprise.of.json('data.image', function (image) {
            return expect(moment().diff(moment(parseInt(image.split('_')[1].slice(0, -4), 36) * 1000))).to.be.below(50);
          });

          return chakram.wait();
        });
    });

    it('should allow to filter boxes by grouptag', function () {
      return chakram.get(`${BASE_URL}/boxes?grouptag=newgroup`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(Array.isArray(response.body)).to.be.true;
          expect(response.body.length).to.be.equal(1);

          return chakram.wait();
        });
    });

    it('should allow to unset the grouptag, description and weblink of the box via PUT', function () {
      const update_payload = { grouptag: '', description: '', weblink: '' };

      return chakram.put(`${BASE_URL}/boxes/${boxIds[1]}`, update_payload, { headers: { 'Authorization': `Bearer ${jwt2}` } })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body.data.grouptag).to.be.undefined;
          expect(response.body.data.description).to.be.undefined;
          expect(response.body.data.weblink).to.be.undefined;

          return chakram.wait();
        });
    });

    it('should accept measurements through mqtt', function () {
      const submitTime = moment.utc();

      const payload = JSON.stringify(json_submit_data.json_arr(boxes[boxIds[1]].sensors));

      return publishMqttMessage('mqtt://mosquitto', 'mytopic', payload)
        .then(function () {
          return new Promise(function (resolve) {
            setTimeout(resolve, 500);
          })
            .then(function () {
              return chakram.get(`${BASE_URL}/boxes/${boxIds[1]}`);
            });
        })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.json('sensors', function (sensors) {
            sensors.forEach(function (sensor) {
              expect(sensor.lastMeasurement).not.to.be.null;
              expect(sensor.lastMeasurement.createdAt).to.exist;
              const createdAt = moment.utc(sensor.lastMeasurement.createdAt);
              expect(submitTime.diff(createdAt, 'minutes')).to.be.below(5);
            });
          });
          countMeasurements = countMeasurements + boxObj.sensors.length;

          return chakram.wait();
        });
    });

    it('should allow to delete all data for a single sensor', function () {
      const tempsensor_id = boxes[boxIds[1]].sensors[boxes[boxIds[1]].sensors.findIndex(s => s.title === 'Temperatur')]._id;
      const payload = { 'deleteAllMeasurements': true };

      return chakram.delete(`${BASE_URL}/boxes/${boxIds[1]}/${tempsensor_id}/measurements`, payload, { headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${jwt2}` } })
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
              }
            });
          });

          return chakram.wait();
        });
    });

    it('should allow to delete data for a single sensor through specifying timestamps', function () {
      let sensor_id;
      //const sensor_id = boxes[boxIds[1]].sensors[boxes[boxIds[1]].sensors.findIndex(s => s.title === 'Beleuchtungsstärke')]._id;
      const payload = { timestamps: [] };

      return chakram.get(`${BASE_URL}/boxes/${boxIds[1]}/sensors`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body.sensors).to.not.be.empty;
          expect(Array.isArray(response.body.sensors)).to.be.true;
          const sensor = response.body.sensors.find(s => s.title === 'Beleuchtungsstärke');
          expect(sensor).to.not.be.undefined;
          expect(sensor.lastMeasurement).to.not.be.undefined;
          sensor_id = sensor._id;
          payload.timestamps.push(sensor.lastMeasurement.createdAt);

          return chakram.delete(`${BASE_URL}/boxes/${boxIds[1]}/${sensor_id}/measurements`, payload, { headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${jwt2}` } });
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
      const sensor_id = boxes[boxIds[1]].sensors[boxes[boxIds[1]].sensors.findIndex(s => s.title === 'rel. Luftfeuchte')]._id;
      const payload = { 'from-date': moment.utc().subtract(1, 'year')
        .toISOString(), 'to-date': moment.utc().toISOString() };

      return chakram.delete(`${BASE_URL}/boxes/${boxIds[1]}/${sensor_id}/measurements`, payload, { headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${jwt2}` } })
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
  });

});

require('./feinstaubaddon_tests');

require('./luftdaten_tests');

require('./delete_user_tests');

require('./mail_tests');
