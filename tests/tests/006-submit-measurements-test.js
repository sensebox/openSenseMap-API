'use strict';

/* global describe it before */

const chakram = require('chakram'),
  expect = chakram.expect,
  moment = require('moment');

process.env.OSEM_TEST_BASE_URL = 'http://localhost:8000';

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

  it('should accept a single measurement via POST', function () {
    let submitTime;

    return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/${boxes[0].sensors[0]._id}`, { 'value': 312.1 })
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

  it('should accept a single measurement with timestamp via POST', function () {
    const submitTime = moment.utc().toISOString();

    return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/${boxes[0].sensors[1]._id}`, { 'value': 123.4, 'createdAt': submitTime })
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

    return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/${boxes[0].sensors[1]._id}`, { 'value': 123.4, 'createdAt': submitTime })
      .then(function (response) {
        expect(response).to.have.status(422);

        return chakram.wait();
      });
  });

  it('should accept multiple measurements as csv via POST', function () {
    let submitTime;

    return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, csv_example_data.no_timestamps(boxes[0].sensors), { json: false, headers: { 'content-type': 'text/csv' } })
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

  it('should accept multiple measurements with timestamps as csv via POST', function () {
    let submitTime;

    return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, csv_example_data.with_timestamps(boxes[0].sensors), { json: false, headers: { 'content-type': 'text/csv' } })
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
    return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, csv_example_data.with_timestamps_future(boxes[0].sensors), { json: false, headers: { 'content-type': 'text/csv' } })
      .then(function (response) {
        expect(response).to.have.status(422);

        return chakram.wait();
      });
  });

  it('should reject multiple measurements with too many fields as csv via POST', function () {
    return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, csv_example_data.with_too_many(boxes[0].sensors), { json: false, headers: { 'content-type': 'text/csv' } })
      .then(function (response) {
        expect(response).to.have.status(422);

        return chakram.wait();
      });
  });


  it('should accept multiple measurements with timestamps as json object via POST', function () {
    let submitTime;

    return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, json_submit_data.json_obj(boxes[0].sensors))
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

  it('should accept multiple measurements with timestamps as json array via POST', function () {
    let submitTime;

    return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, json_submit_data.json_arr(boxes[0].sensors))
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

  it('should accept multiple measurements as bytes via POST', function () {
    let submitTime;

    return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, byte_submit_data(boxes[0].sensors), { json: false, headers: { 'content-type': 'application/sbx-bytes' } })
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

    return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, byte_submit_data(boxes[0].sensors, true), { json: false, headers: { 'content-type': 'application/sbx-bytes-ts' } })
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

  it('should accept multiple csv measurements from ten days ago', function () {
    return chakram.post(`${BASE_URL}/boxes/${boxIds[1]}/data`, csv_example_data.ten_days_ago_many(boxes[1].sensors), { json: false, headers: { 'content-type': 'text/csv' } })
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

  it('should accept measurements through mqtt', function () {
    const submitTime = moment.utc();

    const payload = JSON.stringify(json_submit_data.json_arr(boxes[0].sensors));

    return publishMqttMessage('mqtt://mosquitto', 'mytopic', payload)
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

  it('should accept measurements in random order', function () {
    const sensor_id = boxes[0].sensors[1]._id;
    const payload = [
      { sensor_id, value: 0.1, createdAt: '2016-01-01T04:03:02Z' },
      { sensor_id, value: 0.6, createdAt: '2016-01-19T07:29:57Z' },
      { sensor_id, value: 0.2, createdAt: '2016-01-06T01:00:22Z' },
      { sensor_id, value: 0.5, createdAt: '2016-01-12T12:12:07Z' },
      { sensor_id, value: 0.3, createdAt: '2016-01-02T01:00:22Z' },
      { sensor_id, value: 0.4, createdAt: '2016-01-01T21:23:37Z' },
      { sensor_id, value: 0.8, createdAt: '2016-01-03T00:01:03Z' },
      { sensor_id, value: 0.7, createdAt: '2016-01-23T08:37:23Z' }
    ];

    return chakram.post(`${BASE_URL}/boxes/${boxIds[0]}/data`, payload)
      .then(function (response) {
        expect(response).to.have.status(201);
        expect(response.body).to.equal('Measurements saved in box');

        countMeasurements = countMeasurements + payload.length;
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

});
