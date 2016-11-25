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

  honeybadger_apikey: ''
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

