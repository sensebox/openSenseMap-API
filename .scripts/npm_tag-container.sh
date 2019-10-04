#!/bin/bash

set -euo pipefail
IFS=$'\n\t'

currentBranch=$(git branch | grep -e "^*" | cut -d' ' -f 2)

if [ "$currentBranch" != "master" ]; then
  echo "Tags for containers can only be made from 'master' branch"
  exit 0
fi

# Extract latest git tag
currentVersion=$(git tag -l --sort=-v:refname | grep -E '^v[0-9]+$' | head -n 1 | tr -d 'v')

# Increment
newVersion=$(($currentVersion+1))

tagName="v$newVersion"

# tag new version
git tag "$tagName"

echo "Creation of new tag was successful. New tag is '$tagName'."
echo "Please run 'git push origin master' to trigger the build on docker hub."
