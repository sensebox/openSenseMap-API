#!/usr/bin/env bash
set -euo pipefail

mongocmd="mongo OSeM-api" # TODO: add auth?

echo "$(date +%T) running node migrations"
node migrations/index.js

echo "$(date +%T) running mongoshell migrations"
$mongocmd migrations/mongoshell-*.js

echo "$(date +%T) done"

