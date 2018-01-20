'use strict';

const isProdEnv = function isProdEnv () {
  return process.env.NODE_ENV === 'production';
};

// specify your config items
// environment variables starting with `OSEM_` will override the values here.
// Example: `OSEM_dbhost` will override the setting for `dbhost`
const config = {
  imageFolder: './userimages/', // absolute location of user images

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

// freeze config
module.exports = Object.freeze(config);

