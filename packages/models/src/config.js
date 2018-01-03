'use strict';

const isProdEnv = function isProdEnv () {
  return process.env.NODE_ENV === 'production';
};

// specify your config items
// environment variables starting with `OSEM_` will override the values here.
// Example: `OSEM_targetfolder` will override the setting for `targetFolder`
const config = {
  imageFolder: './userimages/', // absolute location of user images
  logFolder: './logs/', // absolute location of error log files

  // database configuration, will be concatenated to a mongo db connection string
  dbhost: 'localhost',
  dbport: 27017,
  dbuser: 'admin',
  dbuserpass: 'admin',
  dbauthsource: 'OSeM-api',
  dbdb: 'OSeM-api',

  api_measurements_post_domain: '', //just the naked ingress domain. For example ingress.opensensemap.org

  mailer_url: '', // leave empty to not send emails. For example: https://mailer:3924/
  mailer_cert: '',
  mailer_key: '',
  mailer_ca: '',
  mailer_origin: '', // set to the address where your frontend runs. for example: https://opensensemap.org

  jwt_secret: 'OH GOD THIS IS SO INSECURE PLS CHANGE ME', // should be at least 32 characters
  jwt_algorithm: 'HS256',
  jwt_validity_ms: 3600000, // 1 hour
  jwt_issuer: '', // usually the base url of the api. generated if not set from api_protocol and api_base_domain. for example https://api.opensensemap.org

  refresh_token_secret: 'I ALSO WANT TO BE CHANGED',
  refresh_token_algorithm: 'sha256',
  refresh_token_validity_ms: 604800000, // 1 week

  password_min_length: 8,
  password_salt_factor: (isProdEnv() ? 13 : 1), // use at least 10, max 31 (because the lib only allows this much. maybe switch later)

  isProdEnv
};

let env_has_dbconnectionstring = false;
for (const envKey in process.env) {
  if (envKey.indexOf('OSEM_') === 0) {
    const configKey = envKey.substring(5);
    if (env_has_dbconnectionstring === false && configKey === 'dbconnectionstring') {
      env_has_dbconnectionstring = true;
    }
    if (config[configKey] && typeof config[configKey] === 'number') {
      config[configKey] = parseInt(process.env[envKey], 10);
    } else {
      config[configKey] = process.env[envKey];
    }
  }
}

if (env_has_dbconnectionstring === false) {
  config.dbconnectionstring = `mongodb://${config.dbuser}:${config.dbuserpass}@${config.dbhost}:${config.dbport}/${config.dbdb}?authSource=${config.dbauthsource}`;
}

// set composite config keys
if (config.jwt_issuer === '') {
  config.jwt_issuer = `${config.api_protocol}://${config.api_base_domain}`;
}

// freeze config
module.exports = Object.freeze(config);

