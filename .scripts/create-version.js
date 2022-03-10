'use strict';

const { writeFileSync } = require('fs'),
  { execSync } = require('child_process');

const filename_version = 'version.js';

const exec = function exec (cmd) {
  return execSync(cmd)
    .toString()
    .trim();
};

const writeVersionFile = function writeVersionFile (version) {
  writeFileSync(filename_version, `module.exports='${version}';`);
};

try {
  const longHash = exec('git log --pretty=format:"%H" -n 1');
  const tag = exec(`git tag --contains "${longHash}"`);

  if (/^v[0-9]+.[0-9]+.[0-9]+$/.test(tag)) {
    writeVersionFile(tag);
  } else {
    const shortHash = exec('git log --pretty=format:"%h" -n 1');
    const branch = exec('git rev-parse --abbrev-ref HEAD');

    writeVersionFile(`${branch}-${shortHash}`);
  }
} catch (e) { }
