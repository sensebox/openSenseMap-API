#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

# Disclaimer: I am no bash wizard

dont_clean_up=${dont_clean_up:-}
dont_recreate=${dont_recreate:-}

function cleanup {
  if [[ -z "$dont_clean_up" ]]; then
    echo 'cleanup!'
#    docker-compose -p osemapitest -f tests-docker-compose.yml logs osem-api mailer
    docker-compose -p osemapitest -f tests-docker-compose.yml down -v
  fi
}
trap cleanup EXIT

#docker-compose -p osemapitest -f tests-docker-compose.yml up -d --force-rec db
#if [[ -n "$dont_recreate" ]]; then
#  echo 'no recreate'
#  docker-compose -p osemapitest -f tests-docker-compose.yml up -d --remove-orphans --no-deps osem-api
#else
#  #docker-compose -p osemapitest -f tests-docker-compose.yml up -d --force-recreate --remove-orphans --no-deps --build  osem-api
#  docker-compose -p osemapitest -f tests-docker-compose.yml up -d --force-recreate --remove-orphans --no-deps  osem-api
#fi

docker-compose -p osemapitest -f tests-docker-compose.yml down -v
#docker-compose -p osemapitest -f tests-docker-compose.yml up -d --build --force-recreate --remove-orphans
docker-compose -p osemapitest -f tests-docker-compose.yml up -d --force-recreate --remove-orphans

docker-compose -p osemapitest -f tests-docker-compose.yml exec osem-api npm test

