'use strict';

module.exports = {
  $schema: 'http://json-schema.org/draft-04/schema#',
  type: 'object',
  properties: {
    code: {
      type: 'string',
    },
    data: {
      type: 'object',
      properties: {
        box: {
          type: 'object',
          properties: {
            createdAt: {
              type: 'string',
            },
            exposure: {
              type: 'string',
            },
            model: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            updatedAt: {
              type: 'string',
            },
            useAuth: {
              type: 'boolean',
            },
            access_token: {
              type: 'string',
            },
            currentLocation: {
              type: 'object',
              properties: {
                coordinates: {
                  type: 'array',
                  items: { type: 'number' },
                },
                timestamp: { type: 'string' },
                type: { type: 'string' },
              },
              required: ['coordinates', 'timestamp', 'type'],
            },
            loc: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  geometry: {
                    type: 'object',
                    properties: {
                      coordinates: {
                        type: 'array',
                        items: {
                          type: 'number',
                        },
                      },
                      type: {
                        type: 'string',
                      },
                    },
                    required: ['coordinates', 'type'],
                  },
                  type: {
                    type: 'string',
                  },
                },
                required: ['geometry', 'type'],
              },
            },
            sensors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                  },
                  unit: {
                    type: 'string',
                  },
                  sensorType: {
                    type: 'string',
                  },
                  icon: {
                    type: 'string',
                  },
                  _id: {
                    type: 'string',
                  },
                  lastMeasurement: {
                    type: 'object',
                    properties: {
                      value: {
                        type: 'string',
                      },
                      createdAt: {
                        type: 'string',
                      },
                    },
                    required: ['value', 'createdAt'],
                  },
                },
                required: ['title', 'unit', 'sensorType', '_id'],
              },
            },
            _id: {
              type: 'string',
            },
            integrations: {
              type: 'object',
              properties: {
                mqtt: {
                  type: 'object',
                  properties: {
                    url: {
                      type: 'string',
                    },
                    topic: {
                      type: 'string',
                    },
                    decodeOptions: {
                      type: 'string',
                    },
                    connectionOptions: {
                      type: 'string',
                    },
                    messageFormat: {
                      type: 'string',
                    },
                    enabled: {
                      type: 'boolean',
                    },
                  },
                  required: ['enabled'],
                },
                ttn: {
                  type: 'object',
                  properties: {
                    dev_id: {
                      type: 'string',
                    },
                    app_id: {
                      type: 'string',
                    },
                    profile: {
                      type: 'string',
                    },
                  },
                },
              },
              required: ['mqtt'],
            },
          },
          required: [
            'createdAt',
            'exposure',
            'name',
            'updatedAt',
            'currentLocation',
            'loc',
            'sensors',
            '_id',
            'integrations',
          ],
        },
      },
      required: ['box'],
    },
  },
  required: ['code', 'data'],
};
