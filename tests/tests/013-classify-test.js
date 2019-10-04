'use strict';

/* global describe it before after */

const chakram = require('chakram'),
  expect = chakram.expect,
  moment = require('moment'),
  valid_sensebox = require('../data/valid_sensebox');


const BASE_URL = `${process.env.OSEM_TEST_BASE_URL}/boxes`;

describe('openSenseMap API Routes: getBoxes Classification', function () {
  before('add test data', function () {
    return chakram.post(`${process.env.OSEM_TEST_BASE_URL}/users/register`, { name: 'classifytestuser', email: 'classifytestuser@test.test', password: '12345678' })
      .then(function (response) {
        expect(response.body.token).to.exist;

        const jwt = response.body.token;

        return chakram.all([
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes`, valid_sensebox({ lonlat: [7.6456, 51.9624], name: 'noData' }), { headers: { 'Authorization': `Bearer ${jwt}` } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes`, valid_sensebox({ lonlat: [7.6456, 51.9624], name: 'active' }), { headers: { 'Authorization': `Bearer ${jwt}` } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes`, valid_sensebox({ lonlat: [7.6456, 51.9624], name: 'inactive' }), { headers: { 'Authorization': `Bearer ${jwt}` } }),
        ]);
      })
      .then(function (responses) {
        const boxes = responses.map(r => { return { _id: r.body.data._id, sensorid: r.body.data.sensors[0]._id, name: r.body.data.name }; });

        for (const [i, box] of boxes.entries()) {
          box.measurements = [];
          if (box.name === 'senseBoxactive') {
            box.measurements.push({
              sensor: box.sensorid,
              value: i,
              createdAt: moment.utc()
                .clone()
                .subtract(4, 'days')
                .toISOString()
            });
          }
          if (box.name === 'senseBoxinactive') {
            box.measurements.push({
              sensor: box.sensorid,
              value: i,
              createdAt: moment.utc()
                .clone()
                .subtract(10, 'days')
                .toISOString()
            });
          }
        }

        const [first, second, third] = boxes;

        return chakram.all([
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes/${first._id}/data`, first.measurements, { headers: { 'content-type': 'application/json' } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes/${second._id}/data`, second.measurements, { headers: { 'content-type': 'application/json' } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes/${third._id}/data`, third.measurements, { headers: { 'content-type': 'application/json' } }),
        ]);
      });
  });

  after('delete user', function () {
    return chakram.post(`${process.env.OSEM_TEST_BASE_URL}/users/sign-in`, { email: 'classifytestuser@test.test', password: '12345678' })
      .then(function (response) {
        expect(response.body.token).to.exist;

        const jwt = response.body.token;

        return chakram.delete(`${process.env.OSEM_TEST_BASE_URL}/users/me`, { password: '12345678' }, { headers: { 'Authorization': `Bearer ${jwt}` } });
      });
  });

  it('should return boxes with classification', () => {
    return chakram.get(`${BASE_URL}?classify=true`, { headers: { 'x-apicache-bypass': true } })
      .then(function (response) {
        expect(response).status(200);
        expect(response.body).not.empty;
        expect(Array.isArray(response.body)).true;
        expect(response.body.every(function (box) {
          if (box.state) {
            return true;
          }

          return false;
        })).true;

        return chakram.wait();
      });
  });

  it('should return boxes without classification', () => {
    return chakram.get(`${BASE_URL}`, { headers: { 'x-apicache-bypass': true } })
      .then(function (response) {
        expect(response).status(200);
        expect(response.body).not.empty;
        expect(Array.isArray(response.body)).true;
        expect(response.body.every(function (box) {
          if (box.state) {
            return true;
          }

          return false;
        })).false;

        return chakram.wait();
      });
  });

  it('should classify boxes without measurements as old', () => {
    return chakram.get(`${BASE_URL}?classify=true`, { headers: { 'x-apicache-bypass': true } })
      .then(function (response) {
        expect(response).status(200);
        expect(response.body).not.empty;
        expect(Array.isArray(response.body)).true;

        const boxWithoutMeasurements = response.body.filter(function (box) {
          if (box.name === 'senseBoxnoData') {
            return box;
          }
        });
        expect(boxWithoutMeasurements).to.exist;
        expect(boxWithoutMeasurements[0].state).to.equal('old');

        return chakram.wait();
      });
  });

  it('should classify boxes with last measurement younger than 7 days as active', () => {
    return chakram.get(`${BASE_URL}?classify=true`, { headers: { 'x-apicache-bypass': true } })
      .then(function (response) {
        expect(response).status(200);
        expect(response.body).not.empty;
        expect(Array.isArray(response.body)).true;

        const activeBox = response.body.filter(function (box) {
          if (box.name === 'senseBoxactive') {
            return box;
          }
        });

        expect(activeBox).to.exist;
        expect(activeBox[0].state).to.equal('active');

        return chakram.wait();
      });
  });

  it('should classify boxes with last measurement older than 7 days and younger than 30 days as inactive', () => {
    return chakram.get(`${BASE_URL}?classify=true`, { headers: { 'x-apicache-bypass': true } })
      .then(function (response) {
        expect(response).status(200);
        expect(response.body).not.empty;
        expect(Array.isArray(response.body)).true;

        const activeBox = response.body.filter(function (box) {
          if (box.name === 'senseBoxinactive') {
            return box;
          }
        });

        expect(activeBox).to.exist;
        expect(activeBox[0].state).to.equal('inactive');

        return chakram.wait();
      });
  });
});
