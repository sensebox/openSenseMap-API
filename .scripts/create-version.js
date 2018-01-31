'use strict';

const { writeFileSync } = require('fs'),
  { execSync } = require('child_process');

const filename_version = 'version.js';

try {
  const longHash = execSync('git log --pretty=format:"%H" -n 1');
  const tag = execSync(`git tag --contains "${longHash}"`);

  if (/^v[0-9]+$/.test(tag)) {
    writeFileSync(filename_version, `module.exports='${tag}';`);
  } else {
    const shortHash = execSync('git log --pretty=format:"%h" -n 1');
    const branch = execSync('git rev-parse --abbrev-ref HEAD');

    writeFileSync(filename_version, `module.exports='${branch.toString().trim()}-${shortHash}';`);
  }
} catch (e) { }
