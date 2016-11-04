// specify your config items
// environment variables starting with `OSEM_` will override the values here.
// Example: `OSEM_targetfolder` will override the setting for `targetFolder`
'use strict';

var config = {
  targetFolder: '/var/OpenSenseMap-API/usersketches/',
  imageFolder: '/var/www/OpenSenseMap/app/userimages/',
  dbhost: 'db',
  dbuser: '',
  dbuserpass: '',

  port: 8000,
  basePath: '/boxes',
  userPath: '/users',

  mailer_url: '', // leave empty to not send emails
  mailer_cert: '',
  mailer_key: '',
  mailer_ca: '',
  mailer_origin: '',

  slack_url: '',
  measurements_post_domain: '',

  honeybadger_apikey: ''
};

var env_has_dbconnectionstring = false;
for (var envKey in process.env) {
  if (envKey.indexOf('OSEM_') === 0) {
    var configKey = envKey.substring(5);
    if (env_has_dbconnectionstring === false && configKey === 'dbconnectionstring') {
      env_has_dbconnectionstring = true;
    }
    config[configKey] = process.env[envKey];
  }
}

if (env_has_dbconnectionstring === false) {
  config.dbconnectionstring = 'mongodb://' + config.dbuser + ':' + config.dbuserpass + '@' + config.dbhost + '/OSeM-api?authSource=OSeM-api';
}

module.exports = config;

