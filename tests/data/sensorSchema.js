'use strict';

module.exports = {
  '$schema': 'http://json-schema.org/draft-04/schema#',
  'type': 'object',
  'properties': {
    'title': {
      'type': 'string'
    },
    'unit': {
      'type': 'string'
    },
    'sensorType': {
      'type': 'string'
    },
    '_id': {
      'type': 'string'
    },
    'lastMeasurement': {
      'type': 'object',
      'properties': {
        'value': {
          'type': 'string'
        },
        'createdAt': {
          'type': 'string'
        }
      },
      'required': [
        'value',
        'createdAt'
      ]
    }
  },
  'required': [
    'title',
    'unit',
    'sensorType',
    '_id'
  ]
};
