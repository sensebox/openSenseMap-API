'use strict';

/* global describe it before after */

const chakram = require('chakram'),
  expect = chakram.expect,
  parseCSV = require('csv-parse/lib/sync'),
  moment = require('moment');

const modelsRequirePath = '../../node_modules/@sensebox/opensensemap-api-models';

const logResponseIfError = function logResponseIfError (r) {
  if (r.response.statusCode >= 400) {
    /* eslint-disable no-console */
    console.error(r.body);
    /* eslint-enable no-console */
  }

  return r;
};

const minimalSensebox = function minimalSensebox (location = [123, 12, 34], exposure = 'mobile') {
  return { exposure, location, name: 'senseBox', model: 'homeEthernet', };
};

describe('openSenseMap API locations tests', function () {
  let authHeader, authHeaderBox, csvAndAuthHeader, box, submitTimeLoc1;

  before('add test user', function () {
    const user = { name: 'locationtestuser', email: 'locationtestuser@test.test', password: '12345678' };

    return chakram.post(`${process.env.OSEM_TEST_BASE_URL}/users/register`, user)
      .then(logResponseIfError)
      .then(function (response) {
        expect(response.body.token).to.exist;
        authHeader = { headers: { 'Authorization': `Bearer ${response.body.token}` } };
        // done();

        // return chakram.wait();
      });
  });

  after('delete user', function () {
    return chakram.delete(`${process.env.OSEM_TEST_BASE_URL}/users/me`, { password: '12345678' }, authHeader)
      .then(logResponseIfError);
    // .then(() => done());
    // .then(function () {
    //   return chakram.wait();
    // });
  });

  describe('location validation', function () {
    /* eslint-disable global-require */
    const { decoding: { validators: { transformAndValidateCoords: validate } } } = require(modelsRequirePath);
    /* eslint-enable global-require */

    it('should transform latlng object to array', function () {
      const loc = { lng: -120.126, lat: 90, height: 120.123 };

      expect(validate(loc)).to.deep.equal([ loc.lng, loc.lat, loc.height ]);
    });

    it('should reject out of bounds coords', function () {
      const loc1 = [0, -91];
      const loc2 = [181, 0];

      expect(validate.bind(validate, loc1))
        .to.throw(`latitude or longitude is out of bounds in location ${loc1.join(',')}`);
      expect(validate.bind(validate, loc2))
        .to.throw(`latitude or longitude is out of bounds in location ${loc2.join(',')}`);
    });

    it('should reject less than 2 coords', function () {
      const loc = [0];

      expect(validate.bind(validate, loc))
        .to.throw(`missing latitude or longitude in location ${JSON.stringify(loc)}`);
    });

    it('should truncate more than 3 coords', function () {
      const loc = [51.9, 7.59, 66.6, 1234, 5678];

      expect(validate(loc)).to.have.length(3);
    });

    it('should round off obscenely high accuracy', function () {
      const loc = [51.987654321, 7.5987654321, 12341234123412341234.1234123412341234];

      expect(validate(loc)).to.deep.equal([
        Math.round(loc[0] * 10e6) / 10e6,
        Math.round(loc[1] * 10e6) / 10e6,
        Math.round(loc[2] * 10e3) / 10e3,
      ]);
    });

    it('should handle undefined well', function () {
      expect(validate.bind(validate)).to.throw('missing latitude or longitude in location undefined');
    });

  });

  describe('POST /boxes', function () {
    const BASE_URL = `${process.env.OSEM_TEST_BASE_URL}/boxes`;

    it('should allow to set the location for a new box as array', function () {
      const loc = [0, 0, 0];

      return chakram.post(BASE_URL, minimalSensebox(loc), authHeader)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(201);
          expect(response.body.data.currentLocation).to.exist;
          expect(response.body.data.currentLocation.coordinates).to.deep.equal(loc);
          expect(response.body.data.currentLocation.timestamp).to.exist;
          expect(moment().diff(response.body.data.currentLocation.timestamp)).to.be.below(300);

          box = response.body.data;
          authHeaderBox = { headers: { 'Authorization': `${response.body.data.access_token}` } };
          csvAndAuthHeader = { json: false, headers: { 'Content-Type': 'text/csv', 'Authorization': response.body.data.access_token } };

          return chakram.wait();
        });
      // .then(done, done);
    });

    it('should allow to set the location for a new box as latLng object', function () {
      const loc = { lng: 120.123456, lat: 60.654321, height: 12.123 };

      return chakram.post(BASE_URL, minimalSensebox(loc), authHeader)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(201);
          expect(response.body.data.currentLocation).to.exist;
          expect(response.body.data.currentLocation.coordinates).to.deep.equal([
            loc.lng,
            loc.lat,
            loc.height,
          ]);
          expect(response.body.data.currentLocation.timestamp).to.exist;
          expect(moment().diff(response.body.data.currentLocation.timestamp)).to.be.below(300);

          return chakram.wait();
        });
    });

    it('should reject a new box with invalid coords', function () {
      const boxReq = minimalSensebox([52]);

      return chakram.post(BASE_URL, boxReq, authHeader)
        .then(function (response) {
          expect(response).to.have.status(422);
          expect(response.body.message).to.equal('Illegal value for parameter location. missing latitude or longitude in location [52]');

          return chakram.wait();
        });
    });

    it('should reject a new box without location field', function () {
      const boxReq = minimalSensebox();
      delete boxReq.location;

      return chakram.post(BASE_URL, boxReq, authHeader)
        .then(function (response) {
          expect(response).to.have.status(400);
          expect(response.body.message).to.equal('missing required parameter location');

          return chakram.wait();
        });
    });

  });

  describe('PUT /boxes', function () {
    let BASE_URL = `${process.env.OSEM_TEST_BASE_URL}/boxes`;

    before(function () {
      BASE_URL = `${BASE_URL}/${box._id}`; // need to append at test runtime, not at parsetime
    });

    it('should allow updating a boxes location via array', function () {
      const loc = [1, 1, 1];

      return chakram.put(BASE_URL, { location: loc }, authHeader)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body.data.currentLocation).to.exist;
          expect(response.body.data.currentLocation.coordinates).to.deep.equal(loc);
          expect(response.body.data.currentLocation.timestamp).to.exist;
          expect(moment().diff(response.body.data.currentLocation.timestamp)).to.be.below(300);

          submitTimeLoc1 = response.body.data.currentLocation.timestamp;

          return chakram.wait();
        });
    });

    it('should allow updating a boxes location via latlng object', function () {
      const loc = { lng: 2, lat: 2, height: 2 };

      return chakram.put(BASE_URL, { location: loc }, authHeader)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body.data.currentLocation).to.exist;
          expect(response.body.data.currentLocation.coordinates).to.deep.equal([
            loc.lng,
            loc.lat,
            loc.height,
          ]);
          expect(response.body.data.currentLocation.timestamp).to.exist;
          expect(moment().diff(response.body.data.currentLocation.timestamp)).to.be.below(300);

          box = response.body.data;

          return chakram.wait();
        });
    });

  });

  describe('GET /boxes/:boxID', function () {
    let BASE_URL = `${process.env.OSEM_TEST_BASE_URL}/boxes`;
    let result;

    before('get box', function () {
      BASE_URL = `${BASE_URL}/${box._id}`; // need to append at test runtime, not at parsetime

      return chakram.get(BASE_URL)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          result = response.body;
          // done();

          return chakram.wait();
        });
    });

    it('should return the current location in box.currentLocation', function () {
      expect(result.currentLocation).to.exist;
      expect(result.currentLocation).to.deep.equal(box.currentLocation);
    });

    it('should NOT return the whole location history in box.locations', function () {
      expect(result.locations).to.not.exist;
    });

    it('should return the deprecated location in box.loc', function () {
      expect(result.loc).to.exist;
      expect(result.loc).to.deep.equal([{ type: 'Feature', geometry: result.currentLocation }]);
    });

  });

  describe('GET /boxes', function () {
    const BASE_URL = `${process.env.OSEM_TEST_BASE_URL}/boxes`;

    it('should do the same as tested above in GET /boxes/:boxID', function () {
      return chakram.get(BASE_URL)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body).to.have.length(2);

          for (const box of response.body) {
            expect(box.currentLocation).to.exist;
            expect(box.locations).to.not.exist;
          }

          return chakram.wait();
        });
    });

    it('should allow filtering boxes by bounding box', () => {
      const loc = [120.123456, 60.654321, 12.123];

      return chakram.get(`${BASE_URL}?bbox=120,60,121,61`)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);

          expect(response.body).to.be.an('array');
          expect(response.body).to.have.length(1);
          expect(response.body[0].currentLocation.coordinates).to.deep.equal(loc);
        });
    });

  });

  describe('POST /boxes/:boxID/:sensorID', function () {
    let POST_MEASUREMENT_URL, GET_MEASUREMENTS_URL, GET_BOX_URL;

    before(function () {
      POST_MEASUREMENT_URL = `${process.env.OSEM_TEST_BASE_URL}/boxes/${box._id}/${box.sensors[0]._id}`;
      GET_MEASUREMENTS_URL = `${process.env.OSEM_TEST_BASE_URL}/boxes/${box._id}/data/${box.sensors[0]._id}`;
      GET_BOX_URL = `${process.env.OSEM_TEST_BASE_URL}/boxes/${box._id}`;
    });

    it('should allow updating a boxes location via new measurement (array)', function () {
      const measurement = { value: 3, location: [3, 3, 3] };

      return chakram.post(POST_MEASUREMENT_URL, measurement, authHeaderBox)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(201);

          return chakram.get(GET_BOX_URL);
        })
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body.currentLocation.coordinates)
            .to.deep.equal(measurement.location);

          return chakram.wait();
        });
    });

    it('should allow updating a boxes location via new measurement (latLng)', function () {
      const measurement = { value: 4, location: { lat: 4, lng: 4, height: 4 } };

      return chakram.post(POST_MEASUREMENT_URL, measurement, authHeaderBox)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(201);

          return chakram.get(GET_BOX_URL);
        })
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body.currentLocation.coordinates)
            .to.deep.equal([
              measurement.location.lng,
              measurement.location.lat,
              measurement.location.height,
            ]);

          return chakram.wait();
        });
    });

    it('should not update box.currentLocation for an earlier timestamp', function () {
      const measurement = {
        value: -1,
        location: [-1, -1, -1],
        createdAt: moment().subtract(1, 'm'),
      };

      return chakram.post(POST_MEASUREMENT_URL, measurement, authHeaderBox)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(201);

          return chakram.get(GET_BOX_URL);
        })
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body.currentLocation.coordinates)
            .to.deep.equal([4, 4, 4]);

          return chakram.wait();
        });
    });

    it('should predate first location for measurement with timestamp and no location', function () {
      const createdAt = moment().subtract(10, 'm');
      const measurement = { value: -1, createdAt };

      return chakram.post(POST_MEASUREMENT_URL, measurement, authHeaderBox)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(201);

          return chakram.get(`${GET_BOX_URL}/locations`);
        })
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(moment(response.body[0].timestamp).diff(createdAt))
            .to.equal(0);

          return chakram.wait();
        });
    });

    it('should infer measurement.location for measurements without location', function () {
      // timestamp shortly after location that was set through -1 measurement
      const measurement1 = { value: -0.5, createdAt: moment().subtract(1, 'm') };
      // timestamp exactly at time of location set through PUT /boxes/:boxID
      const measurement2 = { value: 1, createdAt: submitTimeLoc1 };

      return chakram.post(POST_MEASUREMENT_URL, measurement1, authHeaderBox)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(201);

          return chakram.post(POST_MEASUREMENT_URL, measurement2, authHeaderBox);
        })
        .then(function (response) {
          expect(response).to.have.status(201);

          return chakram.get(GET_MEASUREMENTS_URL);
        })
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);

          // we're abusing measurement.value as ID here, careful!
          const m1 = response.body.find(m => m.value === '-0.5');
          expect(m1).to.be.not.undefined;
          expect(m1.location).to.deep.equal([-1, -1, -1]);

          const m2 = response.body.find(m => m.value === '1');
          expect(m2).to.be.not.undefined;
          expect(m2.location).to.deep.equal([1, 1, 1]);

          return chakram.wait();
        });
    });

    it('should not update location of measurements for retroactive measurements', function () {
      // measurement2 should get location of previous measurement ([4,4,4])
      const measurement3 = {
        value: 6,
        location: [6, 6, 6],
        createdAt: moment()
      };
      const measurement2 = {
        value: 4.5,
        createdAt: measurement3.createdAt.clone().subtract(2, 'ms')
      };
      const measurement1 = {
        value: 5,
        location: [5, 5, 5],
        createdAt: measurement2.createdAt.clone().subtract(2, 'ms')
      };

      return chakram.post(POST_MEASUREMENT_URL, measurement3, authHeaderBox)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(201);

          return chakram.post(POST_MEASUREMENT_URL, measurement2, authHeaderBox);
        })
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(201);

          return chakram.post(POST_MEASUREMENT_URL, measurement1, authHeaderBox);
        })
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(201);

          return chakram.get(GET_MEASUREMENTS_URL);
        })
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);

          const m1 = response.body.find(m => m.value === '4.5');
          expect(m1).to.be.not.undefined;
          expect(m1.location).to.deep.equal([4, 4, 4]);

          const m2 = response.body.find(m => m.value === '5');
          expect(m2).to.be.not.undefined;
          expect(m2.location).to.deep.equal(measurement1.location);

          const m3 = response.body.find(m => m.value === '6');
          expect(m3).to.be.not.undefined;
          expect(m3.location).to.deep.equal(measurement3.location);

          return chakram.wait();
        });
    });

  });

  describe('POST /boxes/:boxID/data', function () {
    let BASE_URL = `${process.env.OSEM_TEST_BASE_URL}/boxes`;

    before(function () {
      BASE_URL = `${BASE_URL}/${box._id}/data`;
    });

    describe('application/json', function () {

      it('should accept location in measurement object with [value, time, loc]', function () {
        const measurements = {};
        measurements[box.sensors[1]._id] = [7, moment().subtract(2, 'ms'), [7, 7, 7]];
        measurements[box.sensors[2]._id] = [8, moment(), { lat: 8, lng: 8, height: 8 }];

        return chakram.post(BASE_URL, measurements, authHeaderBox)
          .then(logResponseIfError)
          .then(function (response) {
            expect(response).to.have.status(201);

            return chakram.get(`${process.env.OSEM_TEST_BASE_URL}/boxes/${box._id}`);
          })
          .then(logResponseIfError)
          .then(function (response) {
            expect(response).to.have.status(200);
            expect(response.body.currentLocation.coordinates)
              .to.deep.equal([8, 8, 8]);

            return chakram.wait();
          });
      });

      it('should accept location in measurement array', function () {
        const sensor = box.sensors[3]._id;
        const measurements = [
          { sensor_id: sensor, value: 9.6 },
          { sensor_id: sensor, value: 10, location: { lat: 10, lng: 10, height: 10 } },
          { sensor_id: sensor, value: 9.5, createdAt: moment() },
          { sensor_id: sensor, value: 9, createdAt: moment().subtract(2, 'ms'), location: [9, 9, 9] },
          { sensor_id: sensor, value: 10.5 },
        ];

        return chakram.post(BASE_URL, measurements, authHeaderBox)
          .then(logResponseIfError)
          .then(function (response) {
            expect(response).to.have.status(201);

            return chakram.get(`${process.env.OSEM_TEST_BASE_URL}/boxes/${box._id}`);
          })
          .then(logResponseIfError)
          .then(function (response) {
            expect(response).to.have.status(200);
            expect(response.body.currentLocation.coordinates)
              .to.deep.equal([10, 10, 10]);

            return chakram.wait();
          });
      });

      it('should set & infer locations correctly for measurements', function () {

        return chakram.get(`${process.env.OSEM_TEST_BASE_URL}/boxes/${box._id}/data/${box.sensors[3]._id}`)
          .then(logResponseIfError)
          .then(function (response) {
            expect(response).to.have.status(200);
            expect(response.body).to.be.an('array').with.length(5);

            for (const m of response.body) {
              expect(m.location).to.deep.equal(Array(3).fill(parseInt(m.value, 10)));
            }

            return chakram.wait();
          });
      });

    });

    describe('text/csv', function () {

      // const csvAndAuthHeader = Object.assign({ json: false, headers: { 'Content-Type': 'text/csv' } }, authHeaderBox);

      it('should accept 2D locations', function () {
        const measurements = `${box.sensors[3]._id},11,${moment().toISOString()},11,11`;

        return chakram.post(BASE_URL, measurements, csvAndAuthHeader)
          .then(logResponseIfError)
          .then(function (response) {
            expect(response).to.have.status(201);

            return chakram.get(`${process.env.OSEM_TEST_BASE_URL}/boxes/${box._id}`);
          })
          .then(logResponseIfError)
          .then(function (response) {
            expect(response).to.have.status(200);
            expect(response.body.currentLocation.coordinates)
              .to.deep.equal([11, 11]);

            return chakram.wait();
          });
      });

      it('should accept 3D locations', function () {
        const sensor = box.sensors[3]._id;
        const measurements = [
          [sensor, 12.6].join(','),
          [sensor, 12.6, moment().toISOString()].join(','),
          [sensor, 12.6, moment().subtract(2, 'ms').toISOString(), 12, 12, 12].join(','), // eslint-disable-line newline-per-chained-call
        ].join('\n');

        return chakram.post(BASE_URL, measurements, csvAndAuthHeader)
          .then(logResponseIfError)
          .then(function (response) {
            expect(response).to.have.status(201);

            return chakram.get(`${process.env.OSEM_TEST_BASE_URL}/boxes/${box._id}`);
          })
          .then(logResponseIfError)
          .then(function (response) {
            expect(response).to.have.status(200);
            expect(response.body.currentLocation.coordinates)
              .to.deep.equal([12, 12, 12]);

            return chakram.wait();
          });
      });

      it('should reject measurements with location & w/out createdAt', function () {
        const measurements = `${box.sensors[3]._id},13,13,13,13`; // id,value,lng,lat,height

        return chakram.post(BASE_URL, measurements, csvAndAuthHeader)
          .then(function (response) {
            expect(response).to.have.status(422);

            return chakram.wait();
          });
      });

      it('should set & infer locations correctly for measurements', function () {

        return chakram.get(`${process.env.OSEM_TEST_BASE_URL}/boxes/${box._id}/data/${box.sensors[3]._id}`)
          .then(logResponseIfError)
          .then(function (response) {
            expect(response).to.have.status(200);
            expect(response.body).to.be.an('array').with.length(9);

            for (const m of response.body) {
              const numCoords = m.value === '11' ? 2 : 3;
              expect(m.location).to.deep.equal(Array(numCoords).fill(parseInt(m.value, 10)));
            }

            return chakram.wait();
          });
      });

    });

  });

  describe('GET /boxes/data', function () {
    let BASE_URL = `${process.env.OSEM_TEST_BASE_URL}/boxes/data`;
    let CURRENT_LOC_DATA_URL = `${process.env.OSEM_TEST_BASE_URL}/boxes/data`;

    before(function () {
      BASE_URL = `${BASE_URL}?phenomenon=${box.sensors[0].title}`;
      // currentLocation === [10,10,10]
      CURRENT_LOC_DATA_URL = `${CURRENT_LOC_DATA_URL}?phenomenon=${box.sensors[3].title}&bbox=9.9,9.9,10.1,10.1`;
    });

    it('should send lat lon columns by default', function () {
      return chakram.get(`${BASE_URL}&boxId=${box._id}`)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          const data = parseCSV(response.body);
          const lngColumn = data[0].indexOf('lon');
          const latColumn = data[0].indexOf('lat');
          const heightColumn = data[0].indexOf('height');

          expect(lngColumn).to.be.greaterThan(-1);
          expect(latColumn).to.be.greaterThan(-1);
          expect(heightColumn).to.equal(-1);

          return chakram.wait();
        });
    });

    it('should send height column on request', function () {
      return chakram.get(`${BASE_URL}&boxId=${box._id}&columns=value,height`)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          const data = parseCSV(response.body);
          const heightColumn = data[0].indexOf('height');

          expect(heightColumn).to.be.greaterThan(-1);

          return chakram.wait();
        });
    });

    it('should send per measurement coordinates for mobile boxes', function () {
      expect(box.exposure).to.equal('mobile');

      return chakram.get(`${BASE_URL}&boxId=${box._id}&columns=value,lat,lon,height`)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          const data = parseCSV(response.body, { columns: true });

          for (const m of data) {
            // filter measurements with inferred location
            if (m.value.indexOf('.') === -1) {
              expect(m.lon).to.equal(m.value);
              expect(m.lat).to.equal(m.value);
              expect(m.height).to.equal(m.value);
            }
          }

          return chakram.wait();
        });
    });

    it('should filter measurements by bbox for mobile boxes', function () {
      expect(box.exposure).to.equal('mobile');

      return chakram.get(`${BASE_URL}&bbox=-1,-1,0,0`)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          const data = parseCSV(response.body, { columns: true });

          const measuresFiltered = data.filter(m => (
            m.lat >= -1 && m.lat <= 0 &&
            m.lon >= -1 && m.lon <= 0
          ));

          expect(data).to.be.an('array').with.length(3);
          expect(measuresFiltered).to.be.an('array').with.length(3);

          return chakram.get(CURRENT_LOC_DATA_URL);
        })
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          const data = parseCSV(response.body, { columns: true });

          const measuresFiltered = data.filter(m => (
            m.lat >= 9.9 && m.lat <= 10.1 &&
            m.lon >= 9.9 && m.lon <= 10.1
          ));

          expect(data).to.be.an('array').with.length(2);
          expect(measuresFiltered).to.be.an('array').with.length(2);

          return chakram.wait();
        });
    });

    it('should send per measurement coordinates for stationary boxes', function () {
      const updateBoxUrl = `${process.env.OSEM_TEST_BASE_URL}/boxes/${box._id}`;

      return chakram.put(updateBoxUrl, { exposure: 'outdoor' }, authHeader)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body.data.exposure).to.not.equal('mobile');

          box = response.body.data;

          return chakram.get(`${BASE_URL}&boxId=${box._id}&columns=value,lat,lon,height`);
        })
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          const data = parseCSV(response.body, { columns: true });

          for (const m of data) {
            // filter measurements with inferred location
            if (m.value.indexOf('.') === -1) {
              expect(m.lon).to.equal(m.value);
              expect(m.lat).to.equal(m.value);
              expect(m.height).to.equal(m.value);
            }
          }

          return chakram.wait();
        });
    });

    it('should filter measurements by bbox for stationary boxes', function () {
      expect(box.exposure).to.not.equal('mobile');

      return chakram.get(`${BASE_URL}&bbox=0,0,-1,-1&columns=value,lat,lon,height`)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          const data = parseCSV(response.body, { columns: true });

          const measuresFiltered = data.filter(m => (
            m.lat >= -1 && m.lat <= 0 &&
            m.lon >= -1 && m.lon <= 0
          ));

          expect(data).to.be.an('array').with.length(3);
          expect(measuresFiltered).to.be.an('array').with.length(3);

          return chakram.get(CURRENT_LOC_DATA_URL);
        })
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          const data = parseCSV(response.body, { columns: true });

          const measuresFiltered = data.filter(m => (
            m.lat >= 9.9 && m.lat <= 10.1 &&
            m.lon >= 9.9 && m.lon <= 10.1
          ));

          expect(data).to.be.an('array').with.length(2);
          expect(measuresFiltered).to.be.an('array').with.length(2);

          return chakram.wait();
        });
    });

    it('should provide box.currentLocation for legacy measurements without location field', function () {
      /* eslint-disable global-require */
      const { db: { connect, mongoose }, Measurement } = require(modelsRequirePath);
      /* eslint-enable global-require */
      mongoose.set('debug', false);

      // manually create a new measurent without location field
      return connect()
        .then(function () {
          return new Promise(function (resolve, reject) {
            Measurement.collection.insertOne({
              sensor_id: mongoose.Types.ObjectId(box.sensors[4]._id),
              value: 1234,
              createdAt: new Date(),
            }, function (err, result) {
              return err ? reject(err) : resolve(result);
            });
          });
        })
        .then(function () {
          return chakram.get(`${process.env.OSEM_TEST_BASE_URL}/boxes/data?phenomenon=${box.sensors[4].title}&boxId=${box._id}`);
        })
        .then(function (response) {
          expect(response).to.have.status(200);

          const data = parseCSV(response.body, { columns: true });
          expect(data).to.be.an('array').with.length(1);
          expect(data[0].value).to.equal('1234');
          expect(data[0].lon).to.equal('12');
          expect(data[0].lat).to.equal('12');

          return chakram.wait();
        });
    });

  });

  describe('GET /boxes/:boxID/data/:sensorID', function () {
    let BASE_URL = `${process.env.OSEM_TEST_BASE_URL}/boxes`;

    before(function () {
      BASE_URL = `${BASE_URL}/${box._id}/data/${box.sensors[0]._id}`;
    });

    it('should provide coordinates under measurement.location', function () {
      return chakram.get(BASE_URL)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body).to.be.an('array').with.length(9);

          for (const m of response.body) {
            expect(m.location.timestamp).to.not.exist;
            expect(m.location).to.be.an('array');
          }

          return chakram.wait();
        });
    });

  });

  describe('GET /boxes/:boxID/locations', function () {
    let BASE_URL = `${process.env.OSEM_TEST_BASE_URL}/boxes`;
    const daysAgo3 = moment().subtract(3, 'days');
    const daysAgo6 = daysAgo3.clone().subtract(3, 'days');

    it('should return all locations of a box sorted by date', function () {
      BASE_URL = `${BASE_URL}/${box._id}/locations`;

      return chakram.get(BASE_URL)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body).to.have.length(14);

          let prev;
          for (let i = 0; i < response.body.length; i++) {
            const loc = response.body[i];
            expect(loc).to.have.property('type');
            expect(loc).to.have.property('timestamp');
            // locations are inserted in order, starting at -1
            if (i === 12) {
              expect(loc.coordinates).to.deep.equal([i, i].map(v => v - 1));
            } else {
              expect(loc.coordinates).to.deep.equal([i, i, i].map(v => v - 1));
            }

            if (prev) {
              expect(moment(loc.timestamp).diff(prev.timestamp)).to.be.greaterThan(0);
            }
            prev = loc;
          }
        });
    });

    it('should return all locations of a box as GeoJSON LineString', function () {
      return chakram.get(`${BASE_URL}?format=geojson`)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response).to.have.json('type', 'Feature');
          expect(response).to.have.json('properties', function (properties) {
            expect(properties.timestamps).to.be.an('array').with.length(14);
          });
          expect(response).to.have.json('geometry', function (geom) {
            expect(geom).to.have.property('type', 'LineString');
            expect(geom.coordinates).to.be.an('array').with.length(14);
          });

          return chakram.wait();
        });
    });

    it('should return locations of the last 48h by default', function () {
      return chakram.post(`${process.env.OSEM_TEST_BASE_URL}/boxes/${box._id}/data`, [
        { sensor_id: box.sensors[4]._id, value: 123, location: [-3, -3, -3], createdAt: daysAgo3 },
        { sensor_id: box.sensors[4]._id, value: 321, location: [-4, -4, -4], createdAt: daysAgo6 },
      ], authHeaderBox)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(201);

          return chakram.get(BASE_URL);
        })
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body).to.have.length(14);

          return chakram.wait();
        });
    });

    it('should allow filtering locations by date params', function () {
      return chakram.get(`${BASE_URL}?to-date=${daysAgo3.toISOString()}`)
        .then(logResponseIfError)
        .then(function (response) {
          expect(response).to.have.status(200);
          expect(response.body).to.have.length(1);
        });
    });

  });

});
