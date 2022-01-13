'use strict';

/* global describe it before after */

const chakram = require('chakram'),
  expect = chakram.expect,
  moment = require('moment');

const BASE_URL = process.env.OSEM_TEST_BASE_URL,
  csv_example_data = require('../data/csv_example_data'),
  json_submit_data = require('../data/json_submit_data'),
  byte_submit_data = require('../data/byte_submit_data'),
  publishMqttMessage = require('../helpers/mqtt');

describe('submitting measurements', function () {
  let boxes = [];
  let boxIds = [];

  const boxCount = 3;
  let countMeasurements = 32;

  before(function () {
    return chakram.post(`${BASE_URL}/users/sign-in`, { email: 'tester2@test.test', password: '12345678910' })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        expect(response.body.token).to.exist;

        return chakram.get(`${BASE_URL}/users/me/boxes`, { headers: { 'Authorization': `Bearer ${response.body.token}` } });
      })
      .then(function (response) {
        boxIds = response.body.data.boxes.map(b => b._id);
        boxes = response.body.data.boxes;

        return chakram.wait();
      });
  });


  describe('single measurement POST /boxes/boxid/sensorid', function () {

    it('should accept a single measurement via POST', function () {
      let submitTime;

      return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/${boxes[0].sensors[0]._id}`, { 'value': 312.1 }, { headers: { 'Authorization': boxes[0].access_token } })
        .then(function (response) {
          submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
          expect(response).to.have.status(201);
          expect(response.body).to.equal('Measurement saved in box');

          return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}`);
        })
        .then(function (response) {
          expect(response).to.have.json('sensors', function (sensors) {
            sensors.forEach(function (sensor) {
              if (sensor._id === boxes[0].sensors[0]._id) {
                expect(sensor.lastMeasurement).not.to.be.null;
                expect(sensor.lastMeasurement.createdAt).to.exist;
                const createdAt = moment.utc(sensor.lastMeasurement.createdAt);
                expect(createdAt.diff(submitTime)).to.be.below(1000);
                expect(sensor.lastMeasurement.value).to.be.equal('312.1');
                countMeasurements = countMeasurements + 1;
              }
            });
          });

          return chakram.wait();
        });
    });

    it('should reject a single measurement via POST with wrong access_token', function () {

      return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/${boxes[0].sensors[0]._id}`, { 'value': 312.1 }, { headers: { 'Authorization': 'wrongAccessToken' } })
        .then(function (response) {
          expect(response).to.have.status(401);
          expect(response.body.message).to.equal('Box access token not valid!');

          return chakram.wait();

          // return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}`);
        });
    });

    it('should accept a single measurement with timestamp via POST', function () {
      const submitTime = moment.utc().toISOString();

      return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/${boxes[0].sensors[1]._id}`, { 'value': 123.4, 'createdAt': submitTime }, { headers: { 'Authorization': boxes[0].access_token } })
        .then(function (response) {
          expect(response).to.have.status(201);
          expect(response.body).to.equal('Measurement saved in box');

          return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}`);
        })
        .then(function (response) {
          expect(response).to.have.json('sensors', function (sensors) {
            sensors.forEach(function (sensor) {
              if (sensor._id === boxes[0].sensors[1]._id) {
                expect(sensor.lastMeasurement).not.to.be.null;
                expect(sensor.lastMeasurement.createdAt).to.exist;
                const createdAt = moment.utc(sensor.lastMeasurement.createdAt);
                expect(createdAt.diff(submitTime)).to.be.equal(0);
                expect(sensor.lastMeasurement.value).to.be.equal('123.4');
                countMeasurements = countMeasurements + 1;
              }
            });
          });

          return chakram.wait();
        });
    });

    it('should reject a single measurement with timestamp too far into the future via POST', function () {
      const submitTime = moment.utc().add(1.5, 'minutes')
        .toISOString();

      return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/${boxes[0].sensors[1]._id}`, { 'value': 123.4, 'createdAt': submitTime }, { headers: { 'Authorization': boxes[0].access_token } })
        .then(function (response) {
          expect(response).to.have.status(422);

          return chakram.wait();
        });
    });

  });

  describe('multiple CSV POST /boxes/boxid/data', function () {

    it('should accept multiple measurements as csv via POST', function () {
      let submitTime;

      return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, csv_example_data.no_timestamps(boxes[0].sensors), { json: false, headers: { 'content-type': 'text/csv', 'Authorization': boxes[0].access_token } })
        .then(function (response) {
          submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
          expect(response).to.have.status(201);

          return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}`);
        })
        .then(function (response) {
          expect(response).to.have.json('sensors', function (sensors) {
            sensors.forEach(function (sensor) {
              expect(sensor.lastMeasurement).not.to.be.null;
              expect(sensor.lastMeasurement.createdAt).to.exist;
              const createdAt = moment.utc(sensor.lastMeasurement.createdAt);
              expect(createdAt.diff(submitTime)).to.be.below(1000);
              countMeasurements = countMeasurements + 1;
            });
          });

          return chakram.wait();
        });
    });

    it('should reject multiple measurements as csv via POST with wrong access_token', function () {

      return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, csv_example_data.no_timestamps(boxes[0].sensors), { json: false, headers: { 'content-type': 'text/csv', 'Authorization': 'WRONGAUTHTOKEN' } })
        .then(function (response) {
          expect(response).to.have.status(401);
          expect(JSON.parse(response.body).message).to.equal('Box access token not valid!');

          return chakram.wait();

        });
    });

    it('should accept multiple measurements with timestamps as csv via POST', function () {
      let submitTime;

      return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, csv_example_data.with_timestamps(boxes[0].sensors), { json: false, headers: { 'content-type': 'text/csv', 'Authorization': boxes[0].access_token } })
        .then(function (response) {
          submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
          expect(response).to.have.status(201);

          return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}`);
        })
        .then(function (response) {
          expect(response).to.have.json('sensors', function (sensors) {
            sensors.forEach(function (sensor) {
              expect(sensor.lastMeasurement).not.to.be.null;
              expect(sensor.lastMeasurement.createdAt).to.exist;
              const createdAt = moment.utc(sensor.lastMeasurement.createdAt);
              expect(submitTime.diff(createdAt, 'minutes')).to.be.below(5);
              countMeasurements = countMeasurements + 1;
            });
          });

          return chakram.wait();
        });
    });

    it('should reject multiple measurements with timestamps too far into the future as csv via POST', function () {
      return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, csv_example_data.with_timestamps_future(boxes[0].sensors), { json: false, headers: { 'content-type': 'text/csv', 'Authorization': boxes[0].access_token } })
        .then(function (response) {
          expect(response).to.have.status(422);

          return chakram.wait();
        });
    });

    it('should reject multiple measurements with too many fields as csv via POST', function () {
      return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, csv_example_data.with_too_many(boxes[0].sensors), { json: false, headers: { 'content-type': 'text/csv', 'Authorization': boxes[0].access_token } })
        .then(function (response) {
          expect(response).to.have.status(422);

          return chakram.wait();
        });
    });

    it('should accept multiple csv measurements from ten days ago', function () {
      return chakram.post(`${BASE_URL}/boxes/${boxIds[1]}/data`, csv_example_data.ten_days_ago_many(boxes[1].sensors), { json: false, headers: { 'content-type': 'text/csv', 'Authorization': boxes[1].access_token } })
        .then(function (response) {
          expect(response).to.have.status(201);

          return chakram.get(`${BASE_URL}/boxes/${boxIds[1]}`);
        })
        .then(function (response) {
          expect(response).to.have.json('sensors', function (sensors) {
            sensors.forEach(function (sensor) {
              expect(sensor.lastMeasurement).not.to.be.null;
              expect(sensor.lastMeasurement.createdAt).to.exist;
              countMeasurements = countMeasurements + 1;
            });
          });

          return chakram.wait();
        });
    });

  });

  describe('multiple JSON object POST /boxes/boxid/data', function () {
    it('should accept multiple measurements with timestamps as json object via POST and Content-type: json', function () {
      let submitTime;

      return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, JSON.stringify(json_submit_data.json_obj(boxes[0].sensors)), { json: false, headers: { 'content-type': 'json', 'Authorization': boxes[0].access_token } })
        .then(function (response) {
          submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
          expect(response).to.have.status(201);
          expect(response.body).to.equal('"Measurements saved in box"');

          return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}`);
        })
        .then(function (response) {
          expect(response).to.have.json('sensors', function (sensors) {
            sensors.forEach(function (sensor) {
              expect(sensor.lastMeasurement).not.to.be.null;
              expect(sensor.lastMeasurement.createdAt).to.exist;
              const createdAt = moment.utc(sensor.lastMeasurement.createdAt);
              expect(submitTime.diff(createdAt, 'minutes')).to.be.below(4);
              countMeasurements = countMeasurements + 1;
            });
          });

          return chakram.wait();
        });
    });

    it('should accept multiple measurements with timestamps as json object via POST', function () {
      let submitTime;

      return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, json_submit_data.json_obj(boxes[0].sensors), { headers: { 'Authorization': boxes[0].access_token } })
        .then(function (response) {
          submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
          expect(response).to.have.status(201);
          expect(response.body).to.equal('Measurements saved in box');

          return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}`);
        })
        .then(function (response) {
          expect(response).to.have.json('sensors', function (sensors) {
            sensors.forEach(function (sensor) {
              expect(sensor.lastMeasurement).not.to.be.null;
              expect(sensor.lastMeasurement.createdAt).to.exist;
              const createdAt = moment.utc(sensor.lastMeasurement.createdAt);
              expect(submitTime.diff(createdAt, 'minutes')).to.be.below(4);
              countMeasurements = countMeasurements + 1;
            });
          });

          return chakram.wait();
        });
    });

  });

  describe('multiple JSON array POST /boxes/boxid/data', function () {
    it('should accept multiple measurements with timestamps as json array via POST', function () {
      let submitTime;

      return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, json_submit_data.json_arr(boxes[0].sensors), { headers: { 'Authorization': boxes[0].access_token } })
        .then(function (response) {
          submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
          expect(response).to.have.status(201);
          expect(response.body).to.equal('Measurements saved in box');

          return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}`);
        })
        .then(function (response) {
          expect(response).to.have.json('sensors', function (sensors) {
            sensors.forEach(function (sensor) {
              expect(sensor.lastMeasurement).not.to.be.null;
              expect(sensor.lastMeasurement.createdAt).to.exist;
              const createdAt = moment.utc(sensor.lastMeasurement.createdAt);
              expect(submitTime.diff(createdAt, 'minutes')).to.be.below(4);
              countMeasurements = countMeasurements + 1;
            });
          });

          return chakram.wait();
        });
    });

    it('should accept measurements in random order', function () {
      const sensor_id = boxes[0].sensors[1]._id;
      const payload = [
        { sensor_id, value: 0.1, createdAt: '2016-01-01T04:03:02.000Z' },
        { sensor_id, value: 0.6, createdAt: '2016-01-19T07:29:57.000Z' },
        { sensor_id, value: 0.2, createdAt: '2016-01-06T01:00:22.000Z' },
        { sensor_id, value: 0.5, createdAt: '2016-01-12T12:12:07.000Z' },
        { sensor_id, value: 0.3, createdAt: '2016-01-02T01:00:22.000Z' },
        { sensor_id, value: 0.4, createdAt: '2016-01-01T21:23:37.000Z' },
        { sensor_id, value: 0.8, createdAt: '2016-01-03T00:01:03.000Z' },
        { sensor_id, value: 0.7, createdAt: '2016-01-23T08:37:23.000Z' }
      ];

      return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, payload, { headers: { 'Authorization': boxes[0].access_token } })
        .then(function (response) {
          expect(response).to.have.status(201);
          expect(response.body).to.equal('Measurements saved in box');

          return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}/data/${sensor_id}?from-date=2016-01-01T04:00:00Z&to-date=2016-01-23T08:38:00Z`);
        })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

          payload.sort((a, b) => { return new Date(b.createdAt).toISOString()
            .localeCompare(new Date(a.createdAt).toISOString()); });

          expect(response.body).lengthOf(payload.length);
          for (let i = 0; i < payload.length; i++) {
            expect(response.body[i].createdAt).equal(payload[i].createdAt);
            expect(response.body[i].value).equal(payload[i].value.toString());
          }

          countMeasurements = countMeasurements + payload.length;

          return chakram.wait();
        });
    });

    it('should accept historical measurements but not update lastMeasurement of sensors', () => {
      const payload = [
        { sensor: boxes[0].sensors[0]._id, value: 0.1, createdAt: '2010-01-01T04:03:02.000Z' },
        { sensor: boxes[0].sensors[1]._id, value: 0.2, createdAt: '2010-01-06T01:00:22.000Z' },
        { sensor: boxes[0].sensors[2]._id, value: 0.5, createdAt: '2010-01-12T12:12:07.000Z' },
        { sensor: boxes[0].sensors[3]._id, value: 0.3, createdAt: '2010-01-02T01:00:22.000Z' },
      ];

      return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, payload, { headers: { 'Authorization': boxes[0].access_token } })
        .then(function (response) {
          expect(response).to.have.status(201);
          expect(response.body).to.equal('Measurements saved in box');

          return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}/sensors`);
        })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

          for (let i = 0; i < response.body.sensors.length; i++) {
            const sensorID = response.body.sensors[i]._id;
            const lastMeasurement = response.body.sensors[i].lastMeasurement;

            payload.forEach(element => {
              if (element.sensor === sensorID) {
                expect(lastMeasurement.createdAt).to.not.equal(element.createdAt);
              }
            });
          }

          countMeasurements = countMeasurements + payload.length;

          return chakram.wait();
        });
    });

    it('should accept historical measurements but not update property lastMeasurementAt of box', () => {
      const payload = [
        { sensor: boxes[0].sensors[0]._id, value: 0.1, createdAt: '2010-01-01T04:03:02.000Z' },
        { sensor: boxes[0].sensors[1]._id, value: 0.2, createdAt: '2010-01-06T01:00:22.000Z' },
        { sensor: boxes[0].sensors[2]._id, value: 0.5, createdAt: '2010-01-12T12:12:07.000Z' },
        { sensor: boxes[0].sensors[3]._id, value: 0.3, createdAt: '2010-01-02T01:00:22.000Z' },
      ];

      return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, payload, { headers: { 'Authorization': boxes[0].access_token } })
        .then(function (response) {
          expect(response).to.have.status(201);
          expect(response.body).to.equal('Measurements saved in box');

          return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}`);
        })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

          payload.forEach(element => {
            expect(element.createdAt).to.not.equal(response.body.lastMeasurementAt);
          });

          countMeasurements = countMeasurements + payload.length;

          return chakram.wait();
        });
    });
  });

  describe('multiple bytes POST /boxes/boxid/data', function () {

    it('should accept multiple measurements as bytes via POST', function () {
      let submitTime;

      return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, byte_submit_data(boxes[0].sensors), { json: false, headers: { 'content-type': 'application/sbx-bytes', 'Authorization': boxes[0].access_token } })
        .then(function (response) {
          submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
          expect(response).to.have.status(201);
          expect(response.body).to.equal('"Measurements saved in box"');

          return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}`);
        })
        .then(function (response) {
          expect(response).to.have.json('sensors', function (sensors) {
            sensors.forEach(function (sensor) {
              expect(sensor.lastMeasurement).not.to.be.null;
              expect(sensor.lastMeasurement.createdAt).to.exist;
              const createdAt = moment.utc(sensor.lastMeasurement.createdAt);
              expect(submitTime.diff(createdAt, 'minutes')).to.be.below(4);
              countMeasurements = countMeasurements + 1;
            });
          });

          return chakram.wait();
        });
    });

    it('should accept multiple measurements as bytes with timestamp via POST', function () {
      let submitTime;

      return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, byte_submit_data(boxes[0].sensors, true), { json: false, headers: { 'content-type': 'application/sbx-bytes-ts', 'Authorization': boxes[0].access_token } })
        .then(function (response) {
          submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
          expect(response).to.have.status(201);
          expect(response.body).to.equal('"Measurements saved in box"');

          return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}`);
        })
        .then(function (response) {
          expect(response).to.have.json('sensors', function (sensors) {
            sensors.forEach(function (sensor) {
              expect(sensor.lastMeasurement).not.to.be.null;
              expect(sensor.lastMeasurement.createdAt).to.exist;
              const createdAt = moment.utc(sensor.lastMeasurement.createdAt);
              expect(submitTime.diff(createdAt, 'minutes')).to.be.below(5);
              countMeasurements = countMeasurements + 1;
            });
          });

          return chakram.wait();
        });
    });

  });

  it('should accept measurements through mqtt', function () {
    const submitTime = moment.utc();

    const payload = JSON.stringify(json_submit_data.json_arr(boxes[0].sensors));

    return publishMqttMessage('mqtt://mosquitto:8883', 'mytopic', payload)
      .then(function () {
        return new Promise(function (resolve) {
          setTimeout(resolve, 500);
        })
          .then(function () {
            return chakram.get(`${BASE_URL}/boxes/${boxIds[0]}`);
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
            countMeasurements = countMeasurements + 1;
          });
        });

        return chakram.wait();
      });
  });

  after('should return /stats correctly', function () {
    return chakram.get(`${BASE_URL}/stats`, { headers: { 'x-apicache-bypass': true } })
      .then(function (response) {
        const [boxes, measurements] = response.body;
        expect(boxes).to.equal(boxCount);
        expect(measurements).to.equal(countMeasurements);

        return chakram.wait();
      });
  });

});
