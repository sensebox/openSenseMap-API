'use strict';

const { mongoose } = require('../db'),
  Schema = mongoose.Schema,
  moment = require('moment'),
  crypto = require('crypto');

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
    default: moment.utc().add(1, 'd')
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

const claimModel = mongoose.model('Claim', claimSchema);

module.exports = {
  schema: claimSchema,
  model: claimModel
};
