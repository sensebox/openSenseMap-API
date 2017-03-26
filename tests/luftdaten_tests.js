'use strict';

/* global describe it */

const chakram = require('chakram'),
  expect = chakram.expect,
  moment = require('moment');

const BASE_URL = 'http://localhost:8000',
  valid_sensebox = require('./data/valid_sensebox'),
  luftdaten_example_data = require('./data/luftdaten_example_data');

describe('openSenseMap API luftdaten.info devices', function () {
  let jwt, dht11_id, dht22_id, bmp180_id, bme280_id;

  it('should allow to register a luftdaten.info device with dht11', function () {
    return chakram.post(`${BASE_URL}/users/register`, { name: 'luftdaten user', email: 'luftdaten@email', password: '87654321' })
      .then(function (response) {
        expect(response).to.have.status(201);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response.body.token).to.exist;
        jwt = response.body.token;

        return chakram.post(`${BASE_URL}/boxes`, valid_sensebox({ model: 'luftdaten_sds011_dht11' }), { headers: { 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(201);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        const boxId = response.body.data._id;
        dht11_id = boxId;

        return chakram.get(`${BASE_URL}/boxes/${boxId}`);
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.have.json('sensors', function (sensors) {
          expect(sensors.some(function (sensor) {
            return sensor.sensorType === 'DHT11' && sensor.title === 'Temperatur';
          })).to.be.true;
          expect(sensors.some(function (sensor) {
            return sensor.sensorType === 'DHT11' && sensor.title === 'rel. Luftfeuchte';
          })).to.be.true;
        });

        expect(response.body).to.not.have.keys('integrations');

        return chakram.wait();
      });
  });

  it('should allow to register a luftdaten.info device with dht22', function () {
    return chakram.post(`${BASE_URL}/boxes`, valid_sensebox({ model: 'luftdaten_sds011_dht22' }), { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(201);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        const boxId = response.body.data._id;
        dht22_id = boxId;

        return chakram.get(`${BASE_URL}/boxes/${boxId}`);
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.have.json('sensors', function (sensors) {
          expect(sensors.some(function (sensor) {
            return sensor.sensorType === 'DHT22' && sensor.title === 'Temperatur';
          })).to.be.true;
          expect(sensors.some(function (sensor) {
            return sensor.sensorType === 'DHT22' && sensor.title === 'rel. Luftfeuchte';
          })).to.be.true;
        });

        expect(response.body).to.not.have.keys('integrations');

        return chakram.wait();
      });
  });

  it('should allow to register a luftdaten.info device with bmp180', function () {
    return chakram.post(`${BASE_URL}/boxes`, valid_sensebox({ model: 'luftdaten_sds011_bmp180' }), { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(201);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        const boxId = response.body.data._id;
        bmp180_id = boxId;

        return chakram.get(`${BASE_URL}/boxes/${boxId}`);
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.have.json('sensors', function (sensors) {
          expect(sensors.some(function (sensor) {
            return sensor.sensorType === 'BMP180' && sensor.title === 'Temperatur';
          })).to.be.true;
          expect(sensors.some(function (sensor) {
            return sensor.sensorType === 'BMP180' && sensor.title === 'rel. Luftfeuchte';
          })).to.be.true;
        });

        expect(response.body).to.not.have.keys('integrations');

        return chakram.wait();
      });
  });

  it('should allow to register a luftdaten.info device with bme280', function () {
    return chakram.post(`${BASE_URL}/boxes`, valid_sensebox({ model: 'luftdaten_sds011_bme280' }), { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(201);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        const boxId = response.body.data._id;
        bme280_id = boxId;

        return chakram.get(`${BASE_URL}/boxes/${boxId}`);
      })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.have.json('sensors', function (sensors) {
          expect(sensors.some(function (sensor) {
            return sensor.sensorType === 'BME280' && sensor.title === 'Temperatur';
          })).to.be.true;
          expect(sensors.some(function (sensor) {
            return sensor.sensorType === 'BME280' && sensor.title === 'rel. Luftfeuchte';
          })).to.be.true;
          expect(sensors.some(function (sensor) {
            return sensor.sensorType === 'BME280' && sensor.title === 'Luftdruck';
          })).to.be.true;
        });

        expect(response.body).to.not.have.keys('integrations');

        return chakram.wait();
      });
  });

  it('should accept measurements from luftdaten.info devices (SDS test)', function () {
    let submitTime;

    return chakram.post(`${BASE_URL}/boxes/${dht11_id}/data?luftdaten=true`, luftdaten_example_data)
      .then(function (response) {
        submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
        expect(response).to.have.status(201);

        return chakram.get(`${BASE_URL}/boxes/${dht11_id}`);
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

  it('should accept measurements from luftdaten.info devices (DHT11/22 test)', function () {
    let submitTime;
    const testdata = { sensordatavalues: [ { value_type: 'temperature', value: '5.4' }, { value_type: 'humidity', value: '5.4' }] };
    const boxidtouse = dht22_id;

    return chakram.post(`${BASE_URL}/boxes/${boxidtouse}/data?luftdaten=true`, testdata)
      .then(function (response) {
        submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
        expect(response).to.have.status(201);

        return chakram.get(`${BASE_URL}/boxes/${boxidtouse}`);
      })
      .then(function (response) {
        expect(response).to.have.json('sensors', function (sensors) {
          sensors.forEach(function (sensor) {
            if (['Temperatur', 'rel. Luftfeuchte'].includes(sensor.title)) {
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

  it('should accept measurements from luftdaten.info devices (bmp180 test)', function () {
    let submitTime;
    const testdata = { sensordatavalues: [ { value_type: 'BMP_temperature', value: '5.4' }, { value_type: 'BMP_humidity', value: '5.4' }] };
    const boxidtouse = bmp180_id;

    return chakram.post(`${BASE_URL}/boxes/${boxidtouse}/data?luftdaten=true`, testdata)
      .then(function (response) {
        submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
        expect(response).to.have.status(201);

        return chakram.get(`${BASE_URL}/boxes/${boxidtouse}`);
      })
      .then(function (response) {
        expect(response).to.have.json('sensors', function (sensors) {
          sensors.forEach(function (sensor) {
            if (['Temperatur', 'rel. Luftfeuchte'].includes(sensor.title)) {
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

  it('should accept measurements from luftdaten.info devices (bme280 test)', function () {
    let submitTime;
    const testdata = { sensordatavalues: [ { value_type: 'BME280_temperature', value: '5.4' }, { value_type: 'BME280_humidity', value: '5.4' }, { value_type: 'BME280_pressure', value: '5.4' } ] };
    const boxidtouse = bme280_id;

    return chakram.post(`${BASE_URL}/boxes/${boxidtouse}/data?luftdaten=true`, testdata)
      .then(function (response) {
        submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
        expect(response).to.have.status(201);

        return chakram.get(`${BASE_URL}/boxes/${boxidtouse}`);
      })
      .then(function (response) {
        expect(response).to.have.json('sensors', function (sensors) {
          sensors.forEach(function (sensor) {
            if (['Temperatur', 'rel. Luftfeuchte', 'Luftdruck'].includes(sensor.title)) {
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

});
