'use strict';

const ModelError = require('../modelError');

const { mongoose } = require('../db'),
  config = require('config').get('openSenseMap-API-models'),
  Schema = mongoose.Schema,
  moment = require('moment'),
  crypto = require('crypto');

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
claimSchema.index({ boxId: 1 }, { unique: true });

claimSchema.statics.initClaim = function initClaim (boxId, date) {
  const token = crypto.randomBytes(6).toString('hex');

  const claim = {
    boxId,
    token
  };

  if (date) {
    claim['expiresAt'] = date;
  }

  return this.create(claim);
};

claimSchema.statics.findClaimByToken = function findClaimByToken (token) {
  return this.findOne({ token: token });
};

claimSchema.statics.findClaimByDeviceID = function findClaimByDeviceID (deviceId) {
  return this.findOne({ boxId: deviceId });
};

claimSchema.methods.expireToken = function expireToken () {
  const claim = this;
  claim.set('expiresAt', moment.utc().toDate());

  return claim.save();
};

const handleE11000 = function (error, res, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    return next(new ModelError('Token already exists for device.'));
  }
  next();
};

claimSchema.post('save', handleE11000);
claimSchema.post('update', handleE11000);
claimSchema.post('findOneAndUpdate', handleE11000);
claimSchema.post('insertMany', handleE11000);

const claimModel = mongoose.model('Claim', claimSchema);

module.exports = {
  schema: claimSchema,
  model: claimModel
};
