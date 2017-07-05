'use strict';

/* global describe it before after */

const chakram = require('chakram'),
  expect = chakram.expect,
  valid_sensebox = require('../data/valid_sensebox'),
  moment = require('moment'),
  { collectionOf } = require('@turf/invariant');

const BASE_URL = `${process.env.OSEM_TEST_BASE_URL}/statistics/idw`,
  baseTimestamp = moment.utc('2017-01-01T12:00:00Z');

describe('openSenseMap API Routes: /statistics/idw', function () {
  let firstRequest, requestNoData, requestWithData;

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
        const boxes = responses.map(r => { return { _id: r.body.data._id, sensorid: r.body.data.sensors[0]._id }; });

        for (const [ i, box ] of boxes.entries()) {
          box.measurements = [];
          for (let j = 0, len = 10; j < len; j++) {
            box.measurements.push({
              sensor: box.sensorid,
              value: i + j,
              createdAt: baseTimestamp
                .clone()
                .add(1, 'minute')
                .toISOString()
            });
          }
        }

        const [ first, second, third, fourth, fifth, sixth ] = boxes;

        return chakram.all([
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes/${first._id}/data`, first.measurements, { headers: { 'content-type': 'application/json' } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes/${second._id}/data`, second.measurements, { headers: { 'content-type': 'application/json' } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes/${third._id}/data`, third.measurements, { headers: { 'content-type': 'application/json' } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes/${fourth._id}/data`, fourth.measurements, { headers: { 'content-type': 'application/json' } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes/${fifth._id}/data`, fifth.measurements, { headers: { 'content-type': 'application/json' } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes/${sixth._id}/data`, sixth.measurements, { headers: { 'content-type': 'application/json' } }),
        ]);
      })
      .then(function () {

        requestNoData = chakram.get(`${BASE_URL}?exposure=outdoor&bbox=7.6,51.8,7.8,52.0&phenomenon=Luftdruck`);
        requestWithData = chakram.get(`${BASE_URL}?exposure=indoor&bbox=7.6,51.8,7.8,52.0&phenomenon=Temperatur&from-date=${baseTimestamp.clone().toISOString()}&to-date=${baseTimestamp.clone().add(12, 'minute').toISOString()}`);

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
        expect(measurements).equal(60);


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
        expect(response).json('code', 'NotFoundError');
        expect(response).json('message', 'no senseBoxes found');

        return chakram.wait();
      });
  });

  it('should return a geojson featurecollection', function () {
    return requestWithData
      .then(function (response) {
        expect(response).status(200);
        expect(response).schema({ 'properties': { 'code': { 'type': 'string' }, 'data': { 'properties': { 'breaks': { 'items': { 'type': 'number' }, 'type': 'array' }, 'featureCollection': { 'properties': { 'features': { 'items': { 'properties': { 'geometry': { 'properties': { 'coordinates': { 'items': { 'items': { 'items': { 'type': 'number' }, 'type': 'array' }, 'type': 'array' }, 'type': 'array' }, 'type': { 'type': 'string' } }, 'required': ['type', 'coordinates'], 'type': 'object' }, 'properties': { 'properties': { 'idwValues': { 'items': { 'type': 'number' }, 'type': 'array' } }, 'required': ['idwValues'], 'type': 'object' }, 'type': { 'type': 'string' } }, 'required': ['geometry', 'type', 'properties'], 'type': 'object' }, 'type': 'array' }, 'type': { 'type': 'string' } }, 'required': ['type', 'features'], 'type': 'object' }, 'timesteps': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['timesteps', 'breaks', 'featureCollection'], 'type': 'object' } }, 'required': ['code', 'data'], 'type': 'object' });
        expect(collectionOf(response.body.data.featureCollection, 'Polygon', 'test')).to.be.undefined;
        expect(response).json('data.breaks', [0, 2.8, 5.6, 8.399999999999999, 11.2, 14]);
        expect(response).json('data.timesteps', ['2017-01-01T12:01:00.000Z']);

        return chakram.wait();
      });
  });
});

