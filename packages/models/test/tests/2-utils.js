'use strict';

/* global describe it */
const expect = require('chai').expect,
  { utils } = require('../../index');

describe('Utilities', function () {
  describe('parseAndValidateTimestamp', function () {

    it('should accept a valid UTC RFC 3339 timestamp without milliseconds', function () {
      expect(utils.parseAndValidateTimestamp('2018-01-02T21:12:22Z').isValid()).true;
    });

    it('should accept a valid UTC RFC 3339 timestamp with milliseconds', function () {
      expect(utils.parseAndValidateTimestamp('2058-01-02T21:31:40.222Z').isValid()).true;
    });

    const cases = [
      ['missing time', '2058-01-01'],
      ['missing Z', '2058-01-02T21:31:40.222'],
      ['not utc', '2012-12-12T12:13:00+01:00'],
      ['invalid time', '1999-03-01T12Z'],
      ['invalid year', '12-01-03T12:23:43Z'],
      ['invalid year2', '00000-01-03T12:23:43Z'],
      ['invalid month', '2018-1-12T12:12:55Z'],
      ['invalid month 2', '2018-00-12T12:12:55Z'],
      ['invalid month 3', '2018-15-12T12:12:55Z'],
      ['invalid day', '2017-04-40T12:12:12Z'],
      ['invalid hour', '2015-01-01T42:10:12Z'],
      ['malformed', '---T12:32:12Z'],
      ['malformed 2', '2018-01-01-01T12:32:12Z'],
    ];

    for (const [name, ts] of cases) {
      it(`should reject an invalid timestamp (${name})`, function () {
        expect(() => {
          utils.parseAndValidateTimestamp(ts);
        }).throw(`Invalid timestamp '${ts}'.`);
      });
    }

  });
});
