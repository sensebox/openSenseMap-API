'use strict';

const { mongoose } = require('../db'),
  Schema = mongoose.Schema,
  moment = require('moment'),
  crypto = require('crypto'),
  config = require('config');

const {
  amount,
  unit
} = config.get('claims_ttl');

const claimSchema = new Schema({
  boxId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Box',
    required: true,
  },
  token: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: moment.utc().toDate(),
  },
  expiresAt: {
    type: Date,
    default: moment.utc().add(amount, unit)
      .toDate(),
  },
});

claimSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

claimSchema.statics.initClaim = function initClaim (boxId) {
  const token = crypto.randomBytes(6).toString('hex');

  return this.create({
    boxId,
    token
  });
};

claimSchema.statics.findClaimByToken = function findClaimByToken (token) {
  return this.findOne({ token: token });
};

claimSchema.methods.expireToken = function expireToken () {
  const claim = this;
  claim.set('expiresAt', moment.utc().toDate());

  return claim.save();
};

const claimModel = mongoose.model('Claim', claimSchema);

module.exports = {
  schema: claimSchema,
  model: claimModel
};
