'use strict';

/* global describe it */

const chakram = require('chakram'),
  expect = chakram.expect,
  moment = require('moment');

const BASE_URL = 'http://localhost:8000',
  valid_sensebox = require('./data/valid_sensebox'),
  valid_user = require('./data/valid_user'),
  senseBoxSchema = require('./data/senseBoxSchema'),
  senseBoxSchemaAllFields = require('./data/senseBoxSchemaAllFieldsUsers'),
  findAllSchema = require('./data/findAllSchema'),
  csv_example_data = require('./data/csv_example_data'),
  json_submit_data = require('./data/json_submit_data'),
  getUserBoxesSchema = require('./data/getUserBoxesSchema'),
  getUserSchema = require('./data/getUserSchema'),
  luftdaten_example_data = require('./data/luftdaten_example_data'),
  publishMqttMessage = require('./helpers/mqtt'),
  custom_valid_sensebox = require('./data/custom_valid_sensebox');

describe('openSenseMap API', function () {
  let jwt, jwt2;

  describe('/users', function () {
    it('should allow to register an user via POST', function () {
      return chakram.post(`${BASE_URL}/users/register`, valid_user)
        .then(function (response) {
          expect(response).to.have.status(201);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response.body.token).to.exist;

          return chakram.wait();
        });
    });

    it('should deny to register an user with the same email', function () {
      return chakram.post(`${BASE_URL}/users/register`, valid_user)
        .then(function (response) {
          expect(response).to.have.status(400);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

          return chakram.wait();
        });
    });

    it('should deny to register an user with too short password', function () {
      return chakram.post(`${BASE_URL}/users/register`, { name: 'tester', password: 'short', email: 'address@email.com' })
        .then(function (response) {
          expect(response).to.have.status(422);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

          return chakram.wait();
        });
    });

    it('should deny to register an user with no name', function () {
      return chakram.post(`${BASE_URL}/users/register`, { name: '', password: 'longenough', email: 'address@email.com' })
        .then(function (response) {
          expect(response).to.have.status(400);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

          return chakram.wait();
        });
    });

    it('should allow to register a second user via POST', function () {
      return chakram.post(`${BASE_URL}/users/register`, { name: 'mrtest', email: 'tester2@test.test', password: '12345678' })
        .then(function (response) {
          expect(response).to.have.status(201);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response.body.token).to.exist;

          jwt2 = response.body.token;

          return chakram.wait();
        });
    });

    it('should deny to change email and password at the same time', function () {
      return chakram.put(`${BASE_URL}/users/me`, { email: 'new-email@email.www', newPassword: '87654321' }, { headers: { 'Authorization': `Bearer ${jwt2}` } })
        .then(function (response) {
          expect(response).to.have.status(400);
          expect(response).to.have.json('message', 'You cannot change your email address and password in the same request.');

          return chakram.wait();
        });
    });

    it('should deny to change email without current passsword', function () {
      return chakram.put(`${BASE_URL}/users/me`, { email: 'new-email@email.www' }, { headers: { 'Authorization': `Bearer ${jwt2}` } })
        .then(function (response) {
          expect(response).to.have.status(400);
          expect(response).to.have.json('message', 'To change your password or email address, please supply your current password.');

          return chakram.wait();
        });
    });

    it('should deny to change email with wrong current passsword', function () {
      return chakram.put(`${BASE_URL}/users/me`, { email: 'new-email@email.www', currentPassword: 'wrongpassword' }, { headers: { 'Authorization': `Bearer ${jwt2}` } })
        .then(function (response) {
          expect(response).to.have.status(400);
          expect(response).to.have.json('message', 'Current password not correct.');

          return chakram.wait();
        });
    });

    it('should allow to change email with correct current passsword', function () {
      return chakram.put(`${BASE_URL}/users/me`, { email: 'new-email@email.www', currentPassword: '12345678' }, { headers: { 'Authorization': `Bearer ${jwt2}` } })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.json('message', 'User successfully saved. E-Mail changed. Please confirm your new address. Until confirmation, sign in using your old address');

          return chakram.get(`${BASE_URL}/users/me`, { headers: { 'Authorization': `Bearer ${jwt2}` } });
        })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.json('data', function (data) {
            expect(data.me.email).to.equal('tester2@test.test');
          });

          return chakram.wait();
        });
    });

    it('should allow to change name', function () {
      return chakram.put(`${BASE_URL}/users/me`, { name: 'new Name' }, { headers: { 'Authorization': `Bearer ${jwt2}` } })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.json('message', 'User successfully saved.');

          return chakram.get(`${BASE_URL}/users/me`, { headers: { 'Authorization': `Bearer ${jwt2}` } });
        })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.json('data', function (data) {
            expect(data.me.name).to.equal('new Name');
          });

          return chakram.wait();
        });
    });

    it('should deny to change password with too short new password', function () {
      return chakram.put(`${BASE_URL}/users/me`, { newPassword: 'short', currentPassword: '12345678' }, { headers: { 'Authorization': `Bearer ${jwt2}` } })
        .then(function (response) {
          expect(response).to.have.status(400);
          expect(response).to.have.json('message', 'New password should have at least 8 characters');

          return chakram.wait();
        });
    });

    it('should allow to change password with correct current passsword', function () {
      return chakram.put(`${BASE_URL}/users/me`, { newPassword: '12345678910', currentPassword: '12345678' }, { headers: { 'Authorization': `Bearer ${jwt2}` } })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.json('message', 'User successfully saved. Password changed. Please log in with your new password');

          // try to log in with old token
          return chakram.get(`${BASE_URL}/users/me`, { headers: { 'Authorization': `Bearer ${jwt2}` } });
        })
        .then(function (response) {
          expect(response).to.have.status(401);

          // try to sign in with new password
          return chakram.post(`${BASE_URL}/users/sign-in`, { email: 'tester2@test.test', password: '12345678910' });
        })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.json('data', function (data) {
            expect(data.user.email).to.equal('tester2@test.test');
          });
          expect(response.body.token).to.exist;

          jwt2 = response.body.token;

          return chakram.wait();
        });
    });

    it('should deny to sign in with wrong password', function () {
      return chakram.post(`${BASE_URL}/users/sign-in`, { email: 'tester@test.test', password: 'wrong password' })
        .then(function (response) {
          expect(response).to.have.status(401);

          return chakram.wait();
        });
    });

    it('should allow to sign in an user with email and password', function () {
      return chakram.post(`${BASE_URL}/users/sign-in`, valid_user)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response.body.token).to.exist;

          jwt = response.body.token;

          return chakram.wait();
        });
    });

    it('should allow to sign out with jwt', function () {
      return chakram.post(`${BASE_URL}/users/sign-out`, {}, { headers: { 'Authorization': `Bearer ${jwt}` } })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

          return chakram.wait();
        });
    });

    it('should deny to use revoked jwt', function () {
      return chakram.post(`${BASE_URL}/boxes`, valid_sensebox(), { headers: { 'Authorization': `Bearer ${jwt}` } })
        .then(function (response) {
          expect(response).to.have.status(401);

          return chakram.post(`${BASE_URL}/users/sign-in`, valid_user);
        })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response.body.token).to.exist;

          jwt = response.body.token;

          return chakram.wait();
        });
    });

    it('should allow to request a password reset token', function () {
      return chakram.post(`${BASE_URL}/users/request-password-reset`, valid_user)
        .then(function (response) {
          expect(response).to.have.status(200);

          return chakram.wait();
        });
    });

    it('should deny password request with wrong token', function () {
      return chakram.post(`${BASE_URL}/users/password-reset`, { password: 'ignored_anyway', token: 'invalid_password-reset_token', email: 'tester@test.test' })
        .then(function (response) {
          expect(response).to.have.status(403);

          return chakram.wait();
        });
    });

    it('should deny email confirmation with wrong token', function () {
      return chakram.post(`${BASE_URL}/users/confirm-email`, { token: 'invalid_password-reset_token', email: 'tester@test.test' })
        .then(function (response) {
          expect(response).to.have.status(403);

          return chakram.wait();
        });
    });

    it('should allow users to request their details', function () {
      return chakram.get(`${BASE_URL}/users/me`, { headers: { 'Authorization': `Bearer ${jwt}` } })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response).to.have.schema(getUserSchema);
          expect(response).to.comprise.of.json({ code: 'Ok', data: { me: { email: 'tester@test.test' } } });

          return chakram.wait();
        });
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

          expect(response.body).to.not.have.keys('integrations');

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

    it('should return /stats correctly', function () {
      return chakram.get(`${BASE_URL}/stats`)
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

      return chakram.get(`${BASE_URL}/boxes?date=${now.clone().subtract(1, 'minute').toISOString()},${now.toISOString()}`)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(Array.isArray(response.body)).to.be.true;
          expect(response.body.length).to.be.equal(1);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response).to.have.schema(findAllSchema);

          return chakram.get(`${BASE_URL}/boxes?date=${now.clone().subtract(10, 'days').subtract(10, 'minutes').toISOString()},${now.toISOString()}`);
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

      return chakram.get(`${BASE_URL}/boxes?date=${now.clone().subtract(5, 'minutes').toISOString()},${now.toISOString()}&phenomenon=Temperatur`)
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
      return chakram.delete(`${BASE_URL}/boxes/${boxId}`, {}, { headers: { 'Authorization': `Bearer ${jwt}` } })
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

    it('should allow to enable mqtt via PUT', function () {
      const update_payload = { mqtt: { enabled: true, url: 'mqtt://mosquitto', topic: 'mytopic', messageFormat: 'json', decodeOptions: '{}', connectionOptions: '{}' } };

      return chakram.put(`${BASE_URL}/boxes/${boxIds[1]}`, update_payload, { headers: { 'Authorization': `Bearer ${jwt2}` } })
        .then(function (response) {
          expect(response).to.have.status(200);

          return chakram.get(`${BASE_URL}/users/me/boxes`, { headers: { 'Authorization': `Bearer ${jwt2}` } });
        })
        .then(function (response) {
          expect(response).to.have.schema(getUserBoxesSchema);
          // for some reason the second created box is returned first..?
          expect(response).to.comprise.of.json('data.boxes.0.integrations.mqtt', { enabled: true });

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

    it('should accept measurements from luftdaten.info devices', function () {
      let submitTime;

      return chakram.post(`${BASE_URL}/boxes/${custombox_id}/data?luftdaten=true`, luftdaten_example_data)
        .then(function (response) {
          submitTime = moment.utc(response.response.headers.date, 'ddd, DD MMM YYYY HH:mm:ss GMT');
          expect(response).to.have.status(201);

          return chakram.get(`${BASE_URL}/boxes/${custombox_id}`);
        })
        .then(function (response) {
          expect(response).to.have.json('sensors', function (sensors) {
            sensors.forEach(function (sensor) {
              if (['PM10', 'PM2.5'].includes(sensor.title)) {
                expect(sensor.lastMeasurement).not.to.be.null;
                expect(sensor.lastMeasurement.createdAt).to.exist;
                const createdAt = moment.utc(sensor.lastMeasurement.createdAt);
                expect(submitTime.diff(createdAt, 'seconds')).to.be.below(10);
                countMeasurements = countMeasurements + 1;
              }
            });
          });

          return chakram.wait();
        });
    });
  });

});
