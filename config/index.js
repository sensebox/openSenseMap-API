// specify your config items
// environment variables starting with `OSEM_` will override the values here.
// Example: `OSEM_targetfolder` will override the setting for `targetFolder`

var config = {
  targetFolder : '/var/OpenSenseMap-API/usersketches/',
  imageFolder : '/var/www/OpenSenseMap/app/userimages/',
  dbhost : 'db',
  dbuser : '',
  dbuserpass : '',

  port : 8000,

  email_host : '', // leave empty to not send emails
  email_port : 465,
  email_secure : true,
  email_user : '',
  email_pass : '',
  email_fromName : '',
  email_fromEmail : '',
  email_replyTo : '',
  email_subject : '',
}

config.dbconnectionstring = "mongodb://"+config.dbuser+":"+config.dbuserpass+"@"+config.dbhost+ "/OSeM-api?authSource=OSeM-api";

for (envKey in process.env) {
  if (envKey.indexOf("OSEM_") === 0) {
    var configKey = envKey.substring(5)
    config[configKey] = process.env[envKey]
  }
}

module.exports = config

