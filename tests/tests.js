'use strict';
let chakram = require('chakram'),
  expect = chakram.expect;

const BASE_URL = 'http://localhost:8000';

describe('empty openSenseMap API', function () {
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
  });
});
