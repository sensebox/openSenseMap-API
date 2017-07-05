'use strict';

/* global describe it before */

const chakram = require('chakram'),
  expect = chakram.expect;

const BASE_URL = `${process.env.OSEM_TEST_BASE_URL}/stats`,
  options = { headers: { 'x-apicache-bypass': true } };

describe('openSenseMap API Routes: /stats', function () {
  let request, requestHumanTrue, requestHumanFalse, requestHumanWrong1, requestHumanWrong2;
  before(function () {
    request = chakram.get(BASE_URL, options);
    requestHumanTrue = chakram.get(`${BASE_URL}?human=true`, options);
    requestHumanFalse = chakram.get(`${BASE_URL}?human=false`, options);
    requestHumanWrong1 = chakram.get(`${BASE_URL}?human=tr`, options);
    requestHumanWrong2 = chakram.get(`${BASE_URL}?human=fulse`, options);
  });

  it('should return a json array with three numbers', function () {
    return request
      .then(function (response) {
        expect(response).status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        expect(response.body).not.empty;

        expect(Array.isArray(response.body)).true;

        expect(response.body.every(n => typeof n === 'number')).true;

        return chakram.wait();
      });
  });

  it('should return a json array with three strings when called with parameter human=true', function () {
    return requestHumanTrue
      .then(function (response) {
        expect(response).status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        expect(response.body).not.empty;

        expect(Array.isArray(response.body)).true;

        expect(response.body.every(n => typeof n === 'string')).true;

        return chakram.wait();
      });
  });

  it('should return a json array with three numbers when called with parameter human=false', function () {
    return requestHumanFalse
      .then(function (response) {
        expect(response).status(200);
        expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

        expect(response.body).not.empty;

        expect(Array.isArray(response.body)).true;

        expect(response.body.every(n => typeof n === 'number')).true;

        return chakram.wait();
      });
  });

  it('should return an error if parameter human is not true or false', function () {
    return chakram.all([requestHumanWrong1, requestHumanWrong2])
      .then(function (responses) {
        for (const response of responses) {
          expect(response).status(422);
          expect(response).to.have.header('content-type', 'application/json; charset=utf-8');

          expect(response).to.have.json('message', 'illegal value for parameter human. allowed values: true, false');
        }

        return chakram.wait();
      });
  });
});
