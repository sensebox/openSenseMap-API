'use strict';

const isProdEnv = function isProdEnv () {
  return process.env.ENV === 'prod';
};

// specify your config items
// environment variables starting with `OSEM_` will override the values here.
// Example: `OSEM_targetfolder` will override the setting for `targetFolder`
const config = {
  logFolder: './logs/', // absolute location of error log files

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
  jwt_issuer: '', // usually the base url of the api. generated if not set from api_protocol and api_base_domain. for example https://api.opensensemap.org

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

// freeze config
module.exports = Object.freeze(config);

