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
        'me': {
          'type': 'object',
          'properties': {
            'name': {
              'type': 'string'
            },
            'email': {
              'type': 'string'
            },
            'role': {
              'type': 'string'
            },
            'language': {
              'type': 'string'
            },
            'boxes': {
              'type': 'array',
              'items': {}
            }
          },
          'required': [
            'name',
            'email',
            'role',
            'language',
            'boxes'
          ]
        }
      },
      'required': [
        'me'
      ]
    }
  },
  'required': [
    'code',
    'data'
  ]
};
