'use strict';

const Stream = require('stream'),
  bunyan = require('bunyan'),
  config = require('./config'),
  path = require('path');

const consoleStream = new Stream();
consoleStream.writable = true;
consoleStream.write = function (obj) {
  /* eslint-disable no-console */
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

const log = new bunyan.createLogger({
  name: 'OSeM-API models',
  src: true,
  streams,
  serializers: bunyan.stdSerializers
});

module.exports = log;
