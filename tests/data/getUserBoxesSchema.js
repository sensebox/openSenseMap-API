module.exports = {
  '$schema': 'http://json-schema.org/draft-04/schema#',
  'type': 'object',
  'properties': {
    'code': {
      'type': 'string'
    },
    'data': {
      'type': 'object',
      'properties': {
        'boxes': {
          'type': 'array',
          'items': {
            'type': 'object',
            'properties': {
              'boxType': {
                'type': 'string'
              },
              'createdAt': {
                'type': 'string'
              },
              'exposure': {
                'type': 'string'
              },
              'model': {
                'type': 'string'
              },
              'name': {
                'type': 'string'
              },
              'updatedAt': {
                'type': 'string'
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
                    'icon': {
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
                    'icon',
                    '_id'
                  ]
                }
              },
              '_id': {
                'type': 'string'
              },
              'mqtt': {
                'type': 'object',
                'properties': {
                  'url': {
                    'type': 'string'
                  },
                  'topic': {
                    'type': 'string'
                  },
                  'decodeOptions': {
                    'type': 'string'
                  },
                  'connectionOptions': {
                    'type': 'string'
                  },
                  'messageFormat': {
                    'type': 'string'
                  },
                  'enabled': {
                    'type': 'boolean'
                  }
                },
                'required': [
                  'url',
                  'topic',
                  'decodeOptions',
                  'connectionOptions',
                  'messageFormat',
                  'enabled'
                ]
              }
            },
            'required': [
              'boxType',
              'createdAt',
              'exposure',
              'model',
              'name',
              'updatedAt',
              'loc',
              'sensors',
              '_id',
              'mqtt'
            ]
          }
        }
      },
      'required': [
        'boxes'
      ]
    }
  },
  'required': [
    'code',
    'data'
  ]
};
