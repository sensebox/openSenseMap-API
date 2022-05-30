'use strict';

/**
 * This is the default config for the API package
 */

const defer = require('config/defer').deferConfig;

const defaults = {
  'base_domain': 'localhost',
  'protocol': 'https',
  'port': 8000,
  'api_url': '', // if not set, generated from api_protocol and api_base_domain
  'honeybadger_apikey': '',
  'slack_url': '',
  'management_role': 'admin',
  'routes': {
    'boxes': '/boxes',
    'users': '/users',
    'statistics': '/statistics',
    'management': '/management',
    'notifications': '/notifications',
    'badges': '/badges'
  },
  'jwt': {
    'secret': 'OH GOD THIS IS SO INSECURE PLS CHANGE ME', // should be at least 32 characters
    'algorithm': 'HS256',
    'validity_ms': 3600000, // 1 hour
    'issuer': '' // usually the base url of the api. generated if not set from api_protocol and api_base_domain. for example https://api.opensensemap.org
  },
  'refresh_token': {
    'secret': 'I ALSO WANT TO BE CHANGED',
    'algorithm': 'sha256',
    'validity_ms': 604800000 // 1 week
  }
};

// computed keys
defaults['api_url'] = defer(function () {
  return `${this.protocol}://${this.base_domain}`;
});

defaults['jwt']['issuer'] = defer(function () {
  return `${this.protocol}://${this.base_domain}`;
});

module.exports = defaults;
