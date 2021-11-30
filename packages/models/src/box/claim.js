'use strict';

const { mongoose } = require('../db'),
  Schema = mongoose.Schema,
  moment = require('moment'),
  crypto = require('crypto');

const claimSchema = new Schema({
  boxId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Box',
    required: true
  },
  token: {
    type: String
  },
  expires: {
    type: Date,
    default: moment.utc().toDate()
  }
});

claimSchema.index({ expires: 1 }, { expireAfterSeconds: 3600 });

claimSchema.statics.initClaim = function initClaim (boxId) {
  const token = crypto.randomBytes(12).toString('hex');

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
