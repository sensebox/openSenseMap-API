'use strict';

const { mongoose } = require('../db'),
  Schema = mongoose.Schema;

const locationSchema = new Schema(
  {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point'], // only 'Point' allowed
      required: true,
    },
    coordinates: {
      type: [Number], // lng, lat, [height]
      required: true,
      validate: [
        function validateCoordLength (c) {
          return c.length === 2 || c.length === 3;
        },
        '{PATH} must have length 2 or 3',
      ],
    },
    timestamp: {
      type: Date,
    },
  },
  {
    _id: false,
    usePushEach: true,
  }
);

module.exports = {
  schema: locationSchema
};
