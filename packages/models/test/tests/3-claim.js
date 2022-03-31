'use strict';

/* global describe it before after */
const expect = require('chai').expect,
  {
    db: { connect, mongoose },
    Claim,
  } = require('../../index'),
  dbConnectionString = require('../helpers/dbConnectionString'),
  moment = require('moment'),
  ensureIndexes = require('../helpers/ensureIndexes');

const shouldNotHappenThenner = function (err) {
  /* eslint-disable no-console */
  console.log(err);
  /* eslint-enable no-console */
  expect(false).true;
};

const delay = function delay (t, v) {
  return new Promise(function (resolve) {
    setTimeout(resolve.bind(null, v), t);
  });
};

describe('Claim model', function () {

  // Object to save create claims during tests
  // Will have 4 claims after creation
  const testClaims = {};

  before(function () {
    return connect(dbConnectionString({ db: 'claimTest' }))
      .then(() => ensureIndexes());
  });

  after(function () {
    mongoose.disconnect();
  });

  describe('Claim creation', function () {
    it('should create a new claim / token (Claim.create) for transferring a device', function () {
      return Claim.create({
        boxId: '6239a584de404f171cbfca42',
        token: 'asdf1234',
      })
        .then(function (claim) {
          const id = claim._id;

          return Claim.findById(id);
        })
        .then(function (claim) {
          expect(mongoose.Types.ObjectId.isValid(claim.boxId)).true;
          expect(claim.boxId.toString()).equal('6239a584de404f171cbfca42');
          expect(claim.token).equal('asdf1234');

          // TODO: checkout how to compare and evaluate datetimes
          expect(moment.utc(claim.expiresAt).isAfter(moment.utc())).true;

          testClaims[claim.boxId] = claim;
        });
    });

    it('should create a new claim / token (new Claim) for transferring a device', function () {
      const claim = new Claim({
        boxId: '6239a584de404f171cbfca43',
        token: '1234asdf',
      });

      return claim.save()
        .then(function (claim) {
          const id = claim._id;

          return Claim.findById(id);
        })
        .then(function (claim) {
          expect(mongoose.Types.ObjectId.isValid(claim.boxId)).true;
          expect(claim.boxId.toString()).equal('6239a584de404f171cbfca43');
          expect(claim.token).equal('1234asdf');

          // TODO: checkout how to compare and evaluate datetimes
          expect(moment.utc(claim.expiresAt).isAfter(moment.utc())).true;

          testClaims[claim.boxId] = claim;
        });
    });

    it('should create a new claim / token with a generated 6 character token and default expiresAt', function () {
      return Claim.initClaim('6239a584de404f171cbfca44')
        .then(function (claim) {
          expect(claim.token).to.be.a.string;
          expect(claim.token).to.have.lengthOf(12);

          // TODO: checkout how to compare and evaluate datetimes
          expect(moment.utc(claim.expiresAt).isAfter(moment.utc())).true;

          testClaims[claim.boxId] = claim;
        });
    });

    it('should create a new claim / token with a generated 6 character token and custom expiresAt', function () {
      return Claim.initClaim('6239a584de404f171cbfca44', moment.utc().add(2, 'd')).then(function (claim) {
        expect(claim.token).to.be.a.string;
        expect(claim.token).to.have.lengthOf(12);

        // TODO: checkout how to compare and evaluate datetimes
        expect(moment.utc(claim.expiresAt).isAfter(moment.utc())).true;

        testClaims[claim.boxId] = claim;
      });
    });
  });

  describe('Claim discovery', function () {
    it('should find a claim / token by token', function () {
      return Claim.findClaimByToken('asdf1234')
        .then(function (claim) {
          expect(claim.token).equal('asdf1234');
          expect(claim.boxId.toString()).equal('6239a584de404f171cbfca42');
        });
    });

    it('should find a claim / token by device id', function () {
      return Claim.findClaimByToken('1234asdf').then(function (claim) {
        expect(claim.token).equal('1234asdf');
        expect(claim.boxId.toString()).equal('6239a584de404f171cbfca43');
      });
    });
  });

  describe('Claim expiration', function () {
    it('should expire claim / token directly', function () {
      // We have to raise the timeout here and wait for the TTL!
      // More information: https://www.mongodb.com/docs/manual/core/index-ttl/#timing-of-the-delete-operation
      this.timeout(120000);

      return Claim.findClaimByToken('asdf1234')
        .then(function (claim) {
          return claim.expireToken();
        })
        .then(() => new Promise((resolve) => setTimeout(resolve, 70000)))
        .then(function () {
          return Claim.find({});
        })
        .then(function (claims) {
          expect(claims).to.have.lengthOf(3);
        });
    });
  });


});
