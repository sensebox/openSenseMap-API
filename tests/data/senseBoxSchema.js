'use strict';

module.exports = {
  '$schema': 'http://json-schema.org/draft-04/schema#',
  'type': 'object',
  'properties': {
    '_id': {
      'type': 'string'
    },
    'createdAt': {
      'type': 'string'
    },
    'updatedAt': {
      'type': 'string'
    },
    'name': {
      'type': 'string'
    },
    'boxType': {
      'type': 'string'
    },
    'grouptag': {
      'type': 'string'
    },
    'exposure': {
      'type': 'string'
    },
    'model': {
      'type': 'string'
    },
    'description': {
      'type': 'string'
    },
    'image': {
      'type': 'string'
    },
    'sensors': {
      'type': 'array',
      'items': {
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
          }
        },
        'required': [
          'title',
          'unit',
          'sensorType',
          '_id'
        ]
      }
    },
    'loc': {
      'type': 'array',
      'items': {
        'type': 'object',
        'properties': {
          'geometry': {
            'type': 'object',
            'properties': {
              'coordinates': {
                'type': 'array',
                'items': {
                  'type': 'number'
                }
              },
              'type': {
                'type': 'string'
              }
            },
            'required': [
              'coordinates',
              'type'
            ]
          },
          'type': {
            'type': 'string'
          }
        },
        'required': [
          'geometry',
          'type'
        ]
      }
    }
  },
  'required': [
    '_id',
    'createdAt',
    'updatedAt',
    'name',
    'boxType',
    'exposure',
    'sensors',
    'loc'
  ]
};
