'use strict';

/*
  NPM package.json version script. Do not run manually!

  Only tested on Linux. Node v6.

  This script overwrites the first Markdown headline "## Unreleased" with the
  version in the package.json and prepends a new "## Unreleased" headline.

*/

const { version } = require('../package.json'),
  fs = require('fs');

const filename = 'CHANGELOG.md';

fs.readFile(filename, 'utf-8', function(err, data) {
  if (err) return console.log(err);
  const result = data.replace(
    /## Unreleased/i,
    `## Unreleased\n\n## v${version}`
  );

  fs.writeFile(filename, result, 'utf8', function(err) {
    if (err) return console.log(err);
  });
});
