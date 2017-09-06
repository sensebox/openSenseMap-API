#!/bin/bash
set -euo pipefail

# Disclaimer: I am no bash wizard

dont_clean_up=${dont_clean_up:-}
show_logs=${show_logs:-}

cmd=${1:-}
logs_service=${2:-}

case "$cmd" in
"build" )
  docker-compose -p osemapitest -f ./tests/tests-docker-compose.yml build osem-api
  exit 0;
  ;;
"logs" )
  shift # remove "logs" from $@
  show_logs="true"
  if [[ "$logs_service" == "all" ]]; then
    logs_service=""
  fi
  ;;
"dont_clean_up" )
  dont_clean_up="true"
esac

mailer_tag=$(git rev-parse --abbrev-ref HEAD)
if [[ "$mailer_tag" == "master" || "$mailer_tag" == "development" ]]; then
  export SENSEBOX_MAILER_TAG="$mailer_tag"
else
  export SENSEBOX_MAILER_TAG="development"
fi

function cleanup {
  if [[ -n "$show_logs" ]]; then
    if [[ -z "$logs_service" ]]; then
      docker-compose -p osemapitest -f ./tests/tests-docker-compose.yml logs
    else
      docker-compose -p osemapitest -f ./tests/tests-docker-compose.yml logs "$logs_service"
    fi
  fi

  if [[ -z "$dont_clean_up" ]]; then
    echo 'cleanup!'
    docker-compose -p osemapitest -f ./tests/tests-docker-compose.yml down -v
  fi
}
trap cleanup EXIT

docker-compose -p osemapitest -f ./tests/tests-docker-compose.yml down -v
docker-compose -p osemapitest -f ./tests/tests-docker-compose.yml up -d --force-recreate --remove-orphans

docker-compose -p osemapitest -f ./tests/tests-docker-compose.yml exec osem-api yarn test
