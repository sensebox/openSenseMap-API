'use strict';

/* global describe it before */

const chakram = require('chakram'),
  expect = chakram.expect,
  moment = require('moment');

const BASE_URL = process.env.OSEM_TEST_BASE_URL,
  valid_sensebox = require('../data/valid_sensebox'),
  valid_user = require('../data/valid_user'),
  senseBoxSchema = require('../data/senseBoxSchema'),
  getUserBoxesSchema = require('../data/getUserBoxesSchema'),
  custom_valid_sensebox = require('../data/custom_valid_sensebox');

describe('openSenseMap API Routes: /boxes', function () {
  let jwt, jwt2;
  let custombox_id;
  let boxId, boxObj;
  const boxes = {};
  const boxIds = [];
  let boxCount = 0;

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

  it('should return /stats correctly', function () {
    return chakram.get(`${BASE_URL}/stats`)
      .then(function (response) {
        const [boxes, measurements] = response.body;
        expect(boxes).to.equal(boxCount);
        expect(measurements).to.equal(0);

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

        expect(response.body).to.not.have.keys('integrations');

        return chakram.wait();
      });
  });

  it('should return /stats correctly', function () {
    return chakram.get(`${BASE_URL}/stats`)
      .then(function (response) {
        const [boxes, measurements] = response.body;
        expect(boxes).to.equal(boxCount);
        expect(measurements).to.equal(0);

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

  it('should deny to register a senseBox without model or sensors', function () {
    const box = { 'name': 'Wetterstation der AG Klimatologie Uni Münster', 'exposure': 'outdoor', 'location': [7.595878, 51.969263] };

    return chakram.post(`${BASE_URL}/boxes`, box, { headers: { 'Authorization': `Bearer ${jwt2}` } })
      .then(function (response) {
        expect(response).to.have.status(422);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).json({ code: 'UnprocessableEntity', message: 'Validation failed: sensors are required if model is invalid or missing.' });

        return chakram.wait();
      });
  });

  it('should reject to register a senseBox with both model and sensors', function () {
    const box = { 'name': 'Wetterstation der AG Klimatologie Uni Münster', 'exposure': 'outdoor', 'location': [7.595878, 51.969263], model: 'homeWifi', sensors: [{ title: 'Temp', unit: 'C', }] };

    return chakram.post(`${BASE_URL}/boxes`, box, { headers: { 'Authorization': `Bearer ${jwt2}` } })
      .then(function (response) {
        expect(response).to.have.status(422);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).json({ code: 'UnprocessableEntity', message: 'Parameters model and sensors cannot be specified at the same time.' });

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

  it('should deny to delete a senseBox with wrong password via DELETE', function () {
    return chakram.delete(`${BASE_URL}/boxes/${boxId}`, { password: 'not correct password' }, { headers: { 'Authorization': `Bearer ${jwt}` } })
      .then(function (response) {
        expect(response).to.have.status(403);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).to.have.json('message', 'Password incorrect');

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
        expect(response.body.message).to.equal('Validation failed: this profile requires an array \'decodeOptions\'');

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
    const update_payload = { name: 'neuername', exposure: 'indoor', grouptag: 'newgroup', description: 'total neue beschreibung', location: { lat: 54.2, lng: 21.1 }, weblink: 'http://www.google.de', image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=' };

    return chakram.put(`${BASE_URL}/boxes/${boxIds[1]}`, update_payload, { headers: { 'Authorization': `Bearer ${jwt2}` } })
      .then(function (response) {
        expect(response).to.have.status(200);
        expect(response).to.comprise.of.json('data.name', update_payload.name);
        expect(response).to.comprise.of.json('data.exposure', update_payload.exposure);
        expect(response).to.comprise.of.json('data.grouptag', update_payload.grouptag);
        expect(response).to.comprise.of.json('data.description', update_payload.description);
        expect(response).to.comprise.of.json('data.currentLocation', { type: 'Point',
          coordinates: [update_payload.location.lng, update_payload.location.lat]
        });

        // loc field with old schema (backwards compat):
        expect(response).to.comprise.of.json('data.loc', [{
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [
              update_payload.location.lng,
              update_payload.location.lat
            ]
          }
        }]);

        // image should contain timestamp. request duration should be less than 1s.
        expect(response).to.comprise.of.json('data.image', function (image) {
          return expect(moment().diff(moment(parseInt(image.split('_')[1].slice(0, -4), 36) * 1000))).to.be.below(1000);
        });

        return chakram.wait();
      });
  });

  it('should deny to update a box of other users', function () {
    let otherJwt, otherBoxId;

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

        return chakram.put(`${BASE_URL}/boxes/${otherBoxId}`, { name: 'new name, other user' }, { headers: { 'Authorization': `Bearer ${jwt2}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(403);
        expect(response).to.have.json({ code: 'Forbidden', message: 'User does not own this senseBox' });
      });
  });

  it('should deny to delete a box of other users', function () {
    let otherJwt, otherBoxId;

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

        return chakram.delete(`${BASE_URL}/boxes/${otherBoxId}`, { password: '12345678' }, { headers: { 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(403);
        expect(response).to.have.json({ code: 'Forbidden', message: 'User does not own this senseBox' });
      });
  });

  it('should deny to download sketch of a box of other user', function () {
    let otherJwt, otherBoxId;

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

        return chakram.get(`${BASE_URL}/boxes/${otherBoxId}/script`, { headers: { 'Authorization': `Bearer ${jwt}` } });
      })
      .then(function (response) {
        expect(response).to.have.status(403);
        expect(response).to.have.json({ code: 'Forbidden', message: 'User does not own this senseBox' });
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

});
