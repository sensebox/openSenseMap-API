'use strict';

const Stream = require('stream'),
  bunyan = require('bunyan'),
  config = require('./config'),
  path = require('path');

const consoleStream = new Stream();
consoleStream.writable = true;
consoleStream.write = function (obj) {
  /* eslint-disable no-console */
  if (obj.req) {
    const ip = obj.req.headers['x-forwarded-for'] ||
     obj.req.remoteAddress;

    return console.log(`[${obj.time.toISOString()} - ${ip}]: ${obj.req.method} ${obj.req.url}`);
  }

  if (obj.level >= bunyan.WARN) {
    if (obj.err) {
      return console.log(`[${obj.time.toISOString()} - ${bunyan.nameFromLevel[obj.level].toUpperCase()}]: ${obj.err.name} ${obj.src.file}:${obj.src.line}
  ${obj.err.message}
  ${obj.err.stack}
  ${obj.msg}
 `);
    }

    return console.log(`[${obj.time.toISOString()} - ${bunyan.nameFromLevel[obj.level].toUpperCase()}]: ${obj.msg} in ${obj.src.file}:${obj.src.line}`);
  }

  console.log(`[${obj.time.toISOString()} - ${bunyan.nameFromLevel[obj.level].toUpperCase()}]: ${obj.msg}`);
  /* eslint-enable no-console */
};

const streams = [
  { level: 'info', type: 'raw', stream: consoleStream },
];

if (config.isProdEnv()) {
  streams.push({ type: 'rotating-file', level: 'error', path: path.resolve(config.logFolder, 'error.log') });
}

const log = new bunyan.createLogger({
  name: 'OSeM-API',
  src: true,
  streams,
  serializers: bunyan.stdSerializers
});

module.exports = log;
