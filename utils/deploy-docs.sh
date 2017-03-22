#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'


# move to the build dir..
cd $TRAVIS_BUILD_DIR

# install apidocs
npm install -g apidoc@0.17.5

# deploy!

# run apidoc
apidoc -i . -f js -e node_modules

# checkout gh-pages branch
git remote set-branches --add origin gh-pages
git fetch
git checkout -t origin/gh-pages

# delete everything except for the doc folder
find . ! \( -path './.git' -prune \) ! \( -path './doc' -prune \) ! -name '.' ! -name '..' -print0 |  xargs -0 rm -rf --

# move content of doc to .
mv doc/* .

# delete doc folder
rm -rf doc

# add .nojekyll file
touch .nojekyll

# add everything
git add -A

# tell git who you are
git config user.name "Travis-CI"
git config user.email "travis@travis-ci.org"

# commit
git commit -m "apidoc build from ${TRAVIS_COMMIT} by Travis"

# push to github!
git push "https://${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git" gh-pages

