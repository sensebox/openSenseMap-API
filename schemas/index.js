var mongoose = require('mongoose'),
    timestamp = require('mongoose-timestamp'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectID;

//Location schema
var LocationSchema = new Schema({
  type: {
    type: String,
    required: true,
    default: "Feature"
  },
  geometry: {
    type: {
      type: String,
      required: true,
      default:"Point"
    },
    coordinates: {
      type: Array,
      required: true
    }
  },
  properties: Schema.Types.Mixed
});

LocationSchema.index({ 'geometry' : '2dsphere' });

var measurementSchema = new Schema({
  value: {
    type: String,
    required: true
  },
  sensor_id: {
    type: Schema.Types.ObjectId,
    ref: 'Sensor',
    required: true
  }
});

measurementSchema.plugin(timestamp);

//Sensor schema
var sensorSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  sensorType: {
    type: String,
    required: false,
    trim: true
  },
  lastMeasurement: {
    type: Schema.Types.ObjectId,
    ref: 'Measurement'
  }
});

//SenseBox schema
var boxSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  loc: {
    type: [LocationSchema],
    required: true
  },
  boxType: {
    type: String,
    required: true
  },
  exposure: {
    type: String,
    required: false
  },
  grouptag: {
    type: String,
    required: false
  },
  model: {
    type: String,
    required: false
  },
  sensors: [sensorSchema]
},{ strict: false });

var userSchema = new Schema({
  firstname: {
    type: String,
    required: true,
    trim: true
  },
  lastname: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  apikey: {
    type: String,
    trim: true
  },
  boxes: [
    {
      type: String,
      trim: true
    }
  ]
});

module.exports = { 
  'LocationSchema': LocationSchema,
  'measurementSchema': measurementSchema,
  'sensorSchema': sensorSchema,
  'boxSchema': boxSchema,
  'userSchema': userSchema
};