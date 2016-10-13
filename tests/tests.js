'use strict';
let chakram = require('chakram'),
  expect = chakram.expect;

const BASE_URL = 'http://localhost:8000',
  valid_sensebox = require('./data/valid_sensebox'),
  senseBoxSchema = require('./data/senseBoxSchema'),
  senseBoxCreateSchema = require('./data/senseBoxCreateSchema');

describe('openSenseMap API', function () {
  describe('/boxes', function () {

    it('should return an empty array', function () {
      let response = chakram.get(BASE_URL + '/boxes');
      expect(response).to.have.status(200);
      expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
      expect(response).to.comprise.of.json([]);
      return chakram.wait();
    });

    it('should return a geojson feature collection with ?format=geojson', function () {
      let response = chakram.get(BASE_URL + '/boxes?format=geojson');
      expect(response).to.have.status(200);
      expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
      expect(response).to.comprise.of.json({"type":"FeatureCollection","features":[]});
      return chakram.wait();
    });

    it('should return 409 error on wrong format parameter', function () {
      let response = chakram.get(BASE_URL + '/boxes?format=potato');
      expect(response).to.have.status(409);
      expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
      return chakram.wait();
    });

    let boxId, apiKey;

    it('should allow to create a senseBox via POST', function () {
      return chakram.post(BASE_URL + '/boxes', valid_sensebox)
        .then(function (response) {
          expect(response).to.have.status(201);
          expect(response).to.have.schema(senseBoxCreateSchema);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

          boxId = response.body.boxes[0];
          apiKey = response.body.apikey;
          return chakram.get(BASE_URL + '/boxes/' + boxId)
        })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
          expect(response).to.have.schema(senseBoxSchema);
        });
    });

    it('should allow to delete a senseBox via DELETE', function () {
      return chakram.delete(BASE_URL + '/boxes/' + boxId, {}, { headers: { "x-apikey": apiKey  } })
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

          return chakram.get(BASE_URL + '/boxes/' + boxId)
        })
        .then(function (response) {
          expect(response).to.have.status(404);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');
        });
    });
  });

});
