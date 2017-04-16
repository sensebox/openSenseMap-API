'use strict';

// specify your config items
// environment variables starting with `OSEM_` will override the values here.
// Example: `OSEM_targetfolder` will override the setting for `targetFolder`
const config = {
  targetFolder: './usersketches/',
  imageFolder: './userimages/',
  dbhost: 'localhost',
  dbuser: 'senseboxapiuser',
  dbuserpass: 'userpass',

  port: 8000,
  basePath: '/boxes',
  userPath: '/users',
  statisticsPath: '/statistics',

  mailer_url: '', // leave empty to not send emails
  mailer_cert: '',
  mailer_key: '',
  mailer_ca: '',
  mailer_origin: '',

  slack_url: '',
  measurements_post_domain: '',

  honeybadger_apikey: '',

  // TODO: add config key to osem-compose
  jwt_secret: 'OH GOD THIS IS SO INSECURE PLS CHANGE ME', // should be at least 32 characters
  jwt_algorithm: 'HS256',
  jwt_validity_sec: 3600, // 1 hour
  refresh_validity_sec: 604800, // 1 week
  origin: 'localhost:8000', // usually the base url of the api. for example api.opensensemap.org
  salt_factor: (process.env.ENV === 'prod' ? 13 : 1), // use at least 10, max 31 (because the lib only allows this much. maybe switch later)

  refresh_token_secret: 'I ALSO WANT TO BE CHANGED',
  refresh_token_algorithm: 'sha256',

  password_min_length: 8
};

let env_has_dbconnectionstring = false;
for (const envKey in process.env) {
  if (envKey.indexOf('OSEM_') === 0) {
    const configKey = envKey.substring(5);
    if (env_has_dbconnectionstring === false && configKey === 'dbconnectionstring') {
      env_has_dbconnectionstring = true;
    }
    config[configKey] = process.env[envKey];
  }
}

if (env_has_dbconnectionstring === false) {
  config.dbconnectionstring = `mongodb://${config.dbuser}:${config.dbuserpass}@${config.dbhost}/OSeM-api?authSource=OSeM-api`;
}

module.exports = config;

