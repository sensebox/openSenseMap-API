const { mongoose } = require('../db');

const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    default: 'Point',
    enum: ['Point'], // only 'Point' allowed
    required: true
  },
  coordinates: {
    type: [Number], // lng, lat, [height]
    required: true,
    validate: [function validateCoordLength(c) {
      return c.length === 2 || c.length === 3;
    }, '{PATH} must have length 2 or 3']
  }
}, {
  _id: false,
  usePushEach: true
});


const visSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
  },
  desc: {
    type: String
  },
  bbox: {
    required: true,
    type: Object
  },
  pheno: {
    required: true,
    type: Object
  },
  date: {
    required: false,
    type: Date
  },
  dateRange: {
    required: false,
    type: [Date, Date]
  },
  filters: {
    type: Object
  }
});


visSchema.statics.initNew = function ({
  name,
  bbox,
  pheno,
  date,
  dateRange,
  exposure,
  filters
}) {
  return this.create({
    name,
    bbox,
    pheno,
    date,
    dateRange,
    exposure,
    filters
  });

}

const visModel = mongoose.model('Vis', visSchema);

module.exports = {
  schema: visSchema,
  model: visModel
};
