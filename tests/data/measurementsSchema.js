'use strict';

module.exports = {
  'items': {
    'properties': {
      'createdAt': {
        'type': 'string'
      },
      'location': {
        'items': {
          'type': 'number'
        },
        'type': 'array'
      },
      'value': {
        'type': 'string'
      }
    },
    'required': [
      'createdAt',
      'location',
      'value'
    ],
    'type': 'object'
  },
  'type': 'array'
};
