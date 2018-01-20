'use strict';

const isProdEnv = function isProdEnv () {
  return process.env.NODE_ENV === 'production';
};

// specify your config items
// environment variables starting with `OSEM_` will override the values here.
// Example: `OSEM_port` will override the setting for `port`
const config = {
  api_base_domain: 'localhost', // the naked api domain. For example api.opensensemap.org
  api_protocol: (isProdEnv() ? 'https' : 'http'),
  api_url: '', // generated if not set from api_protocol and api_base_domain

  port: 8000, // port the api will bind to

  // configuration for routes
  basePath: '/boxes', // boxes and measurements methods
  userPath: '/users', // user methods
  statisticsPath: '/statistics', //statistics methods

  slack_url: '', // for slack integration

  honeybadger_apikey: '',

  jwt_secret: 'OH GOD THIS IS SO INSECURE PLS CHANGE ME', // should be at least 32 characters
  jwt_algorithm: 'HS256',
  jwt_validity_ms: 3600000, // 1 hour
  jwt_issuer: '', // usually the base url of the api. generated if not set from api_protocol and api_base_domain. for example https://api.opensensemap.org

  refresh_token_secret: 'I ALSO WANT TO BE CHANGED',
  refresh_token_algorithm: 'sha256',
  refresh_token_validity_ms: 604800000, // 1 week

  isProdEnv
};

for (const envKey in process.env) {
  if (envKey.indexOf('OSEM_') === 0) {
    const configKey = envKey.substring(5);
    if (config[configKey] && typeof config[configKey] === 'number') {
      config[configKey] = parseInt(process.env[envKey], 10);
    } else {
      config[configKey] = process.env[envKey];
    }
  }
}

// set composite config keys
if (config.api_url === '') {
  config.api_url = `${config.api_protocol}://${config.api_base_domain}`;
}
if (config.jwt_issuer === '') {
  config.jwt_issuer = `${config.api_protocol}://${config.api_base_domain}`;
}

// freeze config
module.exports = Object.freeze(config);

