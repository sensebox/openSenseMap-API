'use strict';

/* global describe it before after */

const chakram = require('chakram'),
  expect = chakram.expect,
  valid_sensebox = require('../data/valid_sensebox'),
  moment = require('moment'),
  { collectionOf } = require('@turf/invariant');

const BASE_URL = `${process.env.OSEM_TEST_BASE_URL}/statistics/idw`,
  baseTimestamp = moment.utc('2017-01-01T12:00:00Z'),
  hasDataParameters = `exposure=indoor&phenomenon=Temperatur&from-date=${baseTimestamp.clone().toISOString()}&to-date=${baseTimestamp.clone().add(12, 'minute')
    .toISOString()}`;

describe('openSenseMap API Routes: /statistics/idw', function () {
  let firstRequest, requestNoData;

  before('add test data', function () {
    firstRequest = chakram.post(`${process.env.OSEM_TEST_BASE_URL}/users/register`, { name: 'idwtestuser', email: 'idwtestuser@test.test', password: '12345678' })
      .then(function (response) {
        expect(response.body.token).to.exist;

        const jwt = response.body.token;

        return chakram.all([
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes`, valid_sensebox({ lonlat: [ 7.6456, 51.9624 ] }), { headers: { 'Authorization': `Bearer ${jwt}` } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes`, valid_sensebox({ lonlat: [ 7.6556, 51.9824 ] }), { headers: { 'Authorization': `Bearer ${jwt}` } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes`, valid_sensebox({ lonlat: [ 7.6356, 51.9524 ] }), { headers: { 'Authorization': `Bearer ${jwt}` } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes`, valid_sensebox({ lonlat: [ 7.6456, 51.9524 ] }), { headers: { 'Authorization': `Bearer ${jwt}` } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes`, valid_sensebox({ lonlat: [ 7.6556, 51.9724 ] }), { headers: { 'Authorization': `Bearer ${jwt}` } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes`, valid_sensebox({ lonlat: [ 7.6356, 51.9824 ] }), { headers: { 'Authorization': `Bearer ${jwt}` } }),
        ]);
      })
      .then(function (responses) {
        const boxes = responses.map(r => { return { _id: r.body.data._id, sensorid: r.body.data.sensors[0]._id, access_token: r.body.data.access_token }; });

        for (const [ i, box ] of boxes.entries()) {
          box.measurements = [];
          for (let j = 0, len = 15; j < len; j++) {
            box.measurements.push({
              sensor: box.sensorid,
              value: i + j,
              createdAt: baseTimestamp
                .clone()
                .add(j, 'minute')
                .toISOString()
            });
          }
        }

        const [ first, second, third, fourth, fifth, sixth ] = boxes;

        return chakram.all([
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes/${first._id}/data`, first.measurements, { headers: { 'content-type': 'application/json', 'Authorization': first.access_token } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes/${second._id}/data`, second.measurements, { headers: { 'content-type': 'application/json', 'Authorization': second.access_token } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes/${third._id}/data`, third.measurements, { headers: { 'content-type': 'application/json', 'Authorization': third.access_token } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes/${fourth._id}/data`, fourth.measurements, { headers: { 'content-type': 'application/json', 'Authorization': fourth.access_token } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes/${fifth._id}/data`, fifth.measurements, { headers: { 'content-type': 'application/json', 'Authorization': fifth.access_token } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes/${sixth._id}/data`, sixth.measurements, { headers: { 'content-type': 'application/json', 'Authorization': sixth.access_token } }),
        ]);
      })
      .then(function () {
        requestNoData = chakram.get(`${BASE_URL}?exposure=outdoor&bbox=7.6,51.8,7.8,52.0&phenomenon=Luftdruck`);

        return chakram.get(`${process.env.OSEM_TEST_BASE_URL}/stats`, { headers: { 'x-apicache-bypass': true } });
      });
  });

  after('delete user', function () {
    chakram.post(`${process.env.OSEM_TEST_BASE_URL}/users/sign-in`, { email: 'idwtestuser@test.test', password: '12345678' })
      .then(function (response) {
        expect(response.body.token).to.exist;

        const jwt = response.body.token;

        chakram.delete(`${process.env.OSEM_TEST_BASE_URL}/users/me`, { password: '12345678' }, { headers: { 'Authorization': `Bearer ${jwt}` } });
      });
  });

  it('should error with missing parameters', function () {
    return firstRequest
      .then(function (response) {
        expect(response).status(200);
        const [ boxes, measurements ] = response.body;
        expect(boxes).equal(6);
        expect(measurements).equal(90);


        return chakram.get(BASE_URL);
      })
      .then(function (response) {
        expect(response).status(400);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        expect(response.body).not.empty;

        return chakram.wait();
      });
  });

  it('should return a message if no measurements are found', function () {
    return requestNoData
      .then(function (response) {
        expect(response).status(404);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        expect(response).json('code', 'NotFound');
        expect(response).json('message', 'No senseBoxes found');

        return chakram.wait();
      });
  });

  it('should return a geojson featurecollection', function () {
    return chakram.get(`${BASE_URL}?bbox=7.6,51.8,7.8,52.0&${hasDataParameters}&numTimeSteps=1`)
      .then(function (response) {
        expect(response).status(200);
        expect(response).schema({ 'properties': { 'code': { 'type': 'string' }, 'data': { 'properties': { 'breaks': { 'items': { 'type': 'number' }, 'type': 'array' }, 'featureCollection': { 'properties': { 'features': { 'items': { 'properties': { 'geometry': { 'properties': { 'coordinates': { 'items': { 'items': { 'items': { 'type': 'number' }, 'type': 'array' }, 'type': 'array' }, 'type': 'array' }, 'type': { 'type': 'string' } }, 'required': ['type', 'coordinates'], 'type': 'object' }, 'properties': { 'properties': { 'idwValues': { 'items': { 'type': 'number' }, 'type': 'array' } }, 'required': ['idwValues'], 'type': 'object' }, 'type': { 'type': 'string' } }, 'required': ['geometry', 'type', 'properties'], 'type': 'object' }, 'type': 'array' }, 'type': { 'type': 'string' } }, 'required': ['type', 'features'], 'type': 'object' }, 'timesteps': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['timesteps', 'breaks', 'featureCollection'], 'type': 'object' } }, 'required': ['code', 'data'], 'type': 'object' });
        expect(collectionOf(response.body.data.featureCollection, 'Polygon', 'test')).to.be.undefined;
        expect(response).json('data.breaks', [1, 4, 7, 10, 13, 16]);
        expect(response).json('data.timesteps', ['2017-01-01T12:06:00.000Z']);
        // hex polygons have 7 coordinates
        expect(response).json('data.featureCollection', function (fc) {
          return expect(fc.features.every(f => f.geometry.coordinates[0].length === 7)).to.be.true;
        });

        return chakram.wait();
      });
  });

  it('should return requested number of timesteps', function () {
    return chakram.get(`${BASE_URL}?bbox=7.6,51.8,7.8,52.0&${hasDataParameters}&numTimeSteps=9`)
      .then(function (response) {
        expect(response).status(200);
        expect(response).schema({ 'properties': { 'code': { 'type': 'string' }, 'data': { 'properties': { 'breaks': { 'items': { 'type': 'number' }, 'type': 'array' }, 'featureCollection': { 'properties': { 'features': { 'items': { 'properties': { 'geometry': { 'properties': { 'coordinates': { 'items': { 'items': { 'items': { 'type': 'number' }, 'type': 'array' }, 'type': 'array' }, 'type': 'array' }, 'type': { 'type': 'string' } }, 'required': ['type', 'coordinates'], 'type': 'object' }, 'properties': { 'properties': { 'idwValues': { 'items': { 'type': 'number' }, 'type': 'array' } }, 'required': ['idwValues'], 'type': 'object' }, 'type': { 'type': 'string' } }, 'required': ['geometry', 'type', 'properties'], 'type': 'object' }, 'type': 'array' }, 'type': { 'type': 'string' } }, 'required': ['type', 'features'], 'type': 'object' }, 'timesteps': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['timesteps', 'breaks', 'featureCollection'], 'type': 'object' } }, 'required': ['code', 'data'], 'type': 'object' });
        expect(collectionOf(response.body.data.featureCollection, 'Polygon', 'test')).to.be.undefined;
        expect(response).json('data.timesteps', [ '2017-01-01T12:00:40.000Z',
          '2017-01-01T12:02:00.000Z',
          '2017-01-01T12:03:20.000Z',
          '2017-01-01T12:04:40.000Z',
          '2017-01-01T12:06:00.000Z',
          '2017-01-01T12:07:20.000Z',
          '2017-01-01T12:08:40.000Z',
          '2017-01-01T12:10:00.000Z',
          '2017-01-01T12:11:20.000Z' ]);
        expect(response).json('data.featureCollection', function (fc) {
          return expect(fc.features.every(f => f.properties.idwValues.length === 9)).to.be.true;
        });

        return chakram.wait();
      });
  });

  it('should return requested number of classes', function () {
    return chakram.get(`${BASE_URL}?bbox=7.6,51.8,7.8,52.0&${hasDataParameters}&numClasses=7`)
      .then(function (response) {
        expect(response).status(200);
        expect(response).schema({ 'properties': { 'code': { 'type': 'string' }, 'data': { 'properties': { 'breaks': { 'items': { 'type': 'number' }, 'type': 'array' }, 'featureCollection': { 'properties': { 'features': { 'items': { 'properties': { 'geometry': { 'properties': { 'coordinates': { 'items': { 'items': { 'items': { 'type': 'number' }, 'type': 'array' }, 'type': 'array' }, 'type': 'array' }, 'type': { 'type': 'string' } }, 'required': ['type', 'coordinates'], 'type': 'object' }, 'properties': { 'properties': { 'idwValues': { 'items': { 'type': 'number' }, 'type': 'array' } }, 'required': ['idwValues'], 'type': 'object' }, 'type': { 'type': 'string' } }, 'required': ['geometry', 'type', 'properties'], 'type': 'object' }, 'type': 'array' }, 'type': { 'type': 'string' } }, 'required': ['type', 'features'], 'type': 'object' }, 'timesteps': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['timesteps', 'breaks', 'featureCollection'], 'type': 'object' } }, 'required': ['code', 'data'], 'type': 'object' });
        expect(collectionOf(response.body.data.featureCollection, 'Polygon', 'test')).to.be.undefined;
        expect(response.body.data.breaks).lengthOf(7);

        return chakram.wait();
      });
  });

  it('should return square polyons when requested', function () {
    return chakram.get(`${BASE_URL}?bbox=7.6,51.8,7.8,52.0&${hasDataParameters}&gridType=square`)
      .then(function (response) {
        expect(response).status(200);
        expect(response).schema({ 'properties': { 'code': { 'type': 'string' }, 'data': { 'properties': { 'breaks': { 'items': { 'type': 'number' }, 'type': 'array' }, 'featureCollection': { 'properties': { 'features': { 'items': { 'properties': { 'geometry': { 'properties': { 'coordinates': { 'items': { 'items': { 'items': { 'type': 'number' }, 'type': 'array' }, 'type': 'array' }, 'type': 'array' }, 'type': { 'type': 'string' } }, 'required': ['type', 'coordinates'], 'type': 'object' }, 'properties': { 'properties': { 'idwValues': { 'items': { 'type': 'number' }, 'type': 'array' } }, 'required': ['idwValues'], 'type': 'object' }, 'type': { 'type': 'string' } }, 'required': ['geometry', 'type', 'properties'], 'type': 'object' }, 'type': 'array' }, 'type': { 'type': 'string' } }, 'required': ['type', 'features'], 'type': 'object' }, 'timesteps': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['timesteps', 'breaks', 'featureCollection'], 'type': 'object' } }, 'required': ['code', 'data'], 'type': 'object' });
        expect(collectionOf(response.body.data.featureCollection, 'Polygon', 'test')).to.be.undefined;
        // square polygons have 5 coordinates
        expect(response).json('data.featureCollection', function (fc) {
          return expect(fc.features.every(f => f.geometry.coordinates[0].length === 5)).to.be.true;
        });

        return chakram.wait();
      });
  });

  it('should return triangle polyons when requested', function () {
    return chakram.get(`${BASE_URL}?bbox=7.6,51.8,7.8,52.0&${hasDataParameters}&gridType=triangle`)
      .then(function (response) {
        expect(response).status(200);
        expect(response).schema({ 'properties': { 'code': { 'type': 'string' }, 'data': { 'properties': { 'breaks': { 'items': { 'type': 'number' }, 'type': 'array' }, 'featureCollection': { 'properties': { 'features': { 'items': { 'properties': { 'geometry': { 'properties': { 'coordinates': { 'items': { 'items': { 'items': { 'type': 'number' }, 'type': 'array' }, 'type': 'array' }, 'type': 'array' }, 'type': { 'type': 'string' } }, 'required': ['type', 'coordinates'], 'type': 'object' }, 'properties': { 'properties': { 'idwValues': { 'items': { 'type': 'number' }, 'type': 'array' } }, 'required': ['idwValues'], 'type': 'object' }, 'type': { 'type': 'string' } }, 'required': ['geometry', 'type', 'properties'], 'type': 'object' }, 'type': 'array' }, 'type': { 'type': 'string' } }, 'required': ['type', 'features'], 'type': 'object' }, 'timesteps': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['timesteps', 'breaks', 'featureCollection'], 'type': 'object' } }, 'required': ['code', 'data'], 'type': 'object' });
        expect(collectionOf(response.body.data.featureCollection, 'Polygon', 'test')).to.be.undefined;
        // triangle polygons have 4 coordinates
        expect(response).json('data.featureCollection', function (fc) {
          return expect(fc.features.every(f => f.geometry.coordinates[0].length === 4)).to.be.true;
        });

        return chakram.wait();
      });
  });

  it('should return an error if the cellWidth is too small', function () {
    return chakram.get(`${BASE_URL}?bbox=7.6,51.8,7.8,52.0&${hasDataParameters}&cellWidth=0.001`)
      .then(function (response) {
        expect(response).status(422);
        expect(response).json('message', 'planned computation too expensive ((area in square kilometers / cellWidth) > 2500)');

        return chakram.wait();
      });
  });
});

