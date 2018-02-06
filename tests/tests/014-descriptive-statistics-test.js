'use strict';

/* global describe it before after */

const chakram = require('chakram'),
  expect = chakram.expect,
  valid_sensebox = require('../data/valid_sensebox');

const BASE_URL = `${process.env.OSEM_TEST_BASE_URL}/statistics/descriptive?phenomenon=Temperatur`;

describe('openSenseMap API Routes: basic descriptive statistics', function () {
  let boxIds;

  before('add test data', function () {
    return chakram.post(`${process.env.OSEM_TEST_BASE_URL}/users/register`, { name: 'statisticstest', email: 'statisticstest@test.test', password: '12345678' })
      .then(function (response) {
        expect(response.body.token).to.exist;

        const jwt = response.body.token;

        return chakram.all([
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes`, valid_sensebox({ lonlat: [-179.9, -89.9] }), { headers: { 'Authorization': `Bearer ${jwt}` } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes`, valid_sensebox({ lonlat: [-179.9, -89.9] }), { headers: { 'Authorization': `Bearer ${jwt}` } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes`, valid_sensebox({ lonlat: [-179.9, -89.9] }), { headers: { 'Authorization': `Bearer ${jwt}` } }),
        ]);
      })
      .then(function (responses) {
        const boxes = responses.map(r => { return { _id: r.body.data._id, sensorid: r.body.data.sensors[0]._id }; });
        boxIds = responses.map(r => r.body.data._id).join(',');

        for (const box of boxes) {
          box.measurements = `${box.sensorid},147,2018-02-02T14:06:12.620Z
${box.sensorid},145,2018-02-02T15:06:12.620Z
${box.sensorid},143,2018-02-02T16:06:12.620Z
${box.sensorid},141,2018-02-02T17:06:12.620Z
${box.sensorid},139,2018-02-02T18:06:12.620Z
${box.sensorid},137,2018-02-02T19:06:12.620Z
${box.sensorid},135,2018-02-02T20:06:12.620Z
${box.sensorid},133,2018-02-02T21:06:12.620Z
${box.sensorid},131,2018-02-02T22:06:12.620Z
${box.sensorid},129,2018-02-02T23:06:12.620Z
${box.sensorid},127,2018-02-03T00:06:12.620Z
${box.sensorid},125,2018-02-03T01:06:12.620Z
${box.sensorid},123,2018-02-03T02:06:12.620Z
${box.sensorid},121,2018-02-03T03:06:12.620Z
${box.sensorid},119,2018-02-03T04:06:12.620Z
${box.sensorid},117,2018-02-03T05:06:12.620Z
${box.sensorid},115,2018-02-03T06:06:12.620Z
${box.sensorid},113,2018-02-03T07:06:12.620Z
${box.sensorid},111,2018-02-03T08:06:12.620Z
${box.sensorid},109,2018-02-03T09:06:12.620Z
${box.sensorid},107,2018-02-03T10:06:12.620Z
${box.sensorid},105,2018-02-03T11:06:12.620Z
${box.sensorid},103,2018-02-03T12:06:12.620Z
${box.sensorid},101,2018-02-03T13:06:12.620Z
${box.sensorid},99,2018-02-03T14:06:12.620Z
${box.sensorid},97,2018-02-03T15:06:12.620Z
${box.sensorid},95,2018-02-03T16:06:12.620Z
${box.sensorid},93,2018-02-03T17:06:12.620Z
${box.sensorid},91,2018-02-03T18:06:12.620Z
${box.sensorid},89,2018-02-03T19:06:12.620Z
${box.sensorid},87,2018-02-03T20:06:12.620Z
${box.sensorid},85,2018-02-03T21:06:12.620Z
${box.sensorid},83,2018-02-03T22:06:12.620Z
${box.sensorid},81,2018-02-03T23:06:12.620Z
${box.sensorid},79,2018-02-04T00:06:12.620Z
${box.sensorid},77,2018-02-04T01:06:12.620Z
${box.sensorid},75,2018-02-04T02:06:12.620Z
${box.sensorid},73,2018-02-04T03:06:12.620Z
${box.sensorid},71,2018-02-04T04:06:12.620Z
${box.sensorid},69,2018-02-04T05:06:12.620Z
${box.sensorid},67,2018-02-04T06:06:12.620Z
${box.sensorid},65,2018-02-04T07:06:12.620Z
${box.sensorid},63,2018-02-04T08:06:12.620Z
${box.sensorid},61,2018-02-04T09:06:12.620Z
${box.sensorid},59,2018-02-04T10:06:12.620Z
${box.sensorid},57,2018-02-04T11:06:12.620Z
${box.sensorid},55,2018-02-04T12:06:12.620Z
${box.sensorid},53,2018-02-04T13:06:12.620Z
${box.sensorid},51,2018-02-04T14:06:12.620Z
${box.sensorid},49,2018-02-04T15:06:12.620Z
${box.sensorid},47,2018-02-04T16:06:12.620Z
${box.sensorid},45,2018-02-04T17:06:12.620Z
${box.sensorid},43,2018-02-04T18:06:12.620Z
${box.sensorid},41,2018-02-04T19:06:12.620Z
${box.sensorid},39,2018-02-04T20:06:12.620Z
${box.sensorid},37,2018-02-04T21:06:12.620Z
${box.sensorid},35,2018-02-04T22:06:12.620Z
${box.sensorid},33,2018-02-04T23:06:12.620Z
${box.sensorid},31,2018-02-05T00:06:12.620Z
${box.sensorid},29,2018-02-05T01:06:12.620Z
${box.sensorid},27,2018-02-05T02:06:12.620Z
${box.sensorid},25,2018-02-05T03:06:12.620Z
${box.sensorid},23,2018-02-05T04:06:12.620Z
${box.sensorid},21,2018-02-05T05:06:12.620Z
${box.sensorid},19,2018-02-05T06:06:12.620Z
${box.sensorid},17,2018-02-05T07:06:12.620Z
${box.sensorid},15,2018-02-05T08:06:12.620Z
${box.sensorid},13,2018-02-05T09:06:12.620Z
${box.sensorid},11,2018-02-05T10:06:12.620Z
${box.sensorid},9,2018-02-05T11:06:12.620Z
${box.sensorid},7,2018-02-05T12:06:12.620Z
${box.sensorid},5,2018-02-05T13:06:12.620Z
${box.sensorid},3,2018-02-05T14:06:12.620Z
`;
        }

        const [first, second, third] = boxes;

        return chakram.all([
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes/${first._id}/data`, first.measurements, { json: false, headers: { 'content-type': 'text/csv' } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes/${second._id}/data`, second.measurements, { json: false, headers: { 'content-type': 'text/csv' } }),
          chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes/${third._id}/data`, third.measurements, { json: false, headers: { 'content-type': 'text/csv' } }),
        ]);
      });
  });

  after('delete user', function () {
    return chakram.post(`${process.env.OSEM_TEST_BASE_URL}/users/sign-in`, { email: 'statisticstest@test.test', password: '12345678' })
      .then(function (response) {
        expect(response.body.token).to.exist;

        const jwt = response.body.token;

        return chakram.delete(`${process.env.OSEM_TEST_BASE_URL}/users/me`, { password: '12345678' }, { headers: { 'Authorization': `Bearer ${jwt}` } });
      });
  });

  it('should return correct means (bbox)', () => {
    return chakram.get(`${BASE_URL}&window=1d&operation=arithmeticMean&from-date=2018-02-01T12:05:01.909Z&to-date=2018-02-06T12:05:01.913Z&bbox=-180,-90,-179.1,-89.1`)
      .then(function (response) {
        expect(response).status(200);
        expect(response.body).not.empty;
        expect(response).to.have.header('content-type', 'text/csv');
        const [header, ...lines] = response.body.split('\n');
        expect(header).equal('sensorId,2018-02-01T00:00:00.000Z,2018-02-02T00:00:00.000Z,2018-02-03T00:00:00.000Z,2018-02-04T00:00:00.000Z,2018-02-05T00:00:00.000Z,2018-02-06T00:00:00.000Z,2018-02-07T00:00:00.000Z');
        expect(lines).to.have.lengthOf(4);
        for (let i = 0; i < lines.length - 1; i++) {
          const columns = lines[i].split(',');
          expect(columns).lengthOf(8);
          expect(columns[1]).equal('');
          expect(columns[2]).equal('138');
          expect(columns[3]).equal('104');
          expect(columns[4]).equal('56');
          expect(columns[5]).equal('17');
          expect(columns[6]).equal('');
        }

        return chakram.wait();
      });
  });

  it('should return correct means (boxids)', () => {
    return chakram.get(`${BASE_URL}&window=1d&operation=arithmeticMean&from-date=2018-02-01T12:05:01.909Z&to-date=2018-02-06T12:05:01.913Z&boxids=${boxIds}`)
      .then(function (response) {
        expect(response).status(200);
        expect(response.body).not.empty;
        expect(response).to.have.header('content-type', 'text/csv');
        const [header, ...lines] = response.body.split('\n');
        expect(header).equal('sensorId,2018-02-01T00:00:00.000Z,2018-02-02T00:00:00.000Z,2018-02-03T00:00:00.000Z,2018-02-04T00:00:00.000Z,2018-02-05T00:00:00.000Z,2018-02-06T00:00:00.000Z,2018-02-07T00:00:00.000Z');
        expect(lines).to.have.lengthOf(4);
        for (let i = 0; i < lines.length - 1; i++) {
          const columns = lines[i].split(',');
          expect(columns).lengthOf(8);
          expect(columns[1]).equal('');
          expect(columns[2]).equal('138');
          expect(columns[3]).equal('104');
          expect(columns[4]).equal('56');
          expect(columns[5]).equal('17');
          expect(columns[6]).equal('');
        }

        return chakram.wait();
      });
  });

  it('should return no means', () => {
    return chakram.get(`${BASE_URL}&window=1d&operation=arithmeticMean&from-date=2017-02-01T12:05:01.909Z&to-date=2017-02-06T12:05:01.913Z&boxids=${boxIds}`)
      .then(function (response) {
        expect(response).status(200);
        expect(response.body).not.empty;
        expect(response).to.have.header('content-type', 'text/csv');
        expect(response.body.split('\n')).lengthOf(2);
      });
  });
});
