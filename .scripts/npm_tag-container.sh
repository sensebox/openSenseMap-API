#!/bin/bash

set -euo pipefail
IFS=$'\n\t'

currentBranch=$(git branch | grep -e "^*" | cut -d' ' -f 2)

if [ "$currentBranch" != "master" ]; then
  echo "Tags for containers can only be made from 'master' branch"
  exit 1
fi

# Extract latest git tag
currentVersion=$(git tag -l --sort=-v:refname | grep dockerhub-v | head -n 1 | tr -d 'dockerhub\-v')

# Increment
newVersion=$(($currentVersion+1))

# tag new version
git tag "dockerhub-v$newVersion"

echo "Creation of new tag for docker hub was successful. New tag is 'dockerhub-v$newVersion'."
echo "Please run 'git push origin master' to trigger the build on docker hub."
