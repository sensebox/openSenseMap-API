#!/bin/bash
set -euo pipefail

# Disclaimer: I am no bash wizard

# The first argument to the script.
# If no argument is specified, it runs the tests and cleans up.
# Possible values:
#    build          build services
#    logs           show logs
#    dont_clean_up  dont run docker-compose down
#    only_models    only run the models tests
cmd=${1:-}
# If the first argument is logs, you can specifiy the services for which to show
# logs for with the second argument
logs_service=${2:-}

# Set up some helper variables
dont_clean_up=${dont_clean_up:-}
show_logs=${show_logs:-}
only_models_tests=${only_models_tests:-}
git_branch=$(git rev-parse --abbrev-ref HEAD)

function runComposeCommand() {
  docker-compose -p osemapitest -f ./tests/docker-compose.yml "$@"
}

function cleanup() {
  if [[ -n $show_logs ]]; then
    if [[ -z $logs_service ]]; then
      runComposeCommand logs
    else
      runComposeCommand logs "$logs_service"
    fi
  fi

  if [[ -z $dont_clean_up ]]; then
    echo 'cleanup!'
    runComposeCommand down -v --remove-orphans
  fi
}
trap cleanup EXIT

function executeTests() {
  runComposeCommand down -v --remove-orphans

  if [[ -z $only_models_tests ]]; then
    runComposeCommand up -d --force-recreate --remove-orphans

    # Allow the dust to settle
    sleep 3

    runComposeCommand exec osem-api yarn mocha --exit tests/waitForHttp.js tests/tests.js
    runComposeCommand stop osem-api
  fi

  runComposeCommand up -d --remove-orphans db mailer
  # use ./node_modules/.bin/mocha because the workspace does not have the devDependency mocha
  runComposeCommand run --workdir=/usr/src/app/packages/models osem-api ../../node_modules/.bin/mocha --exit test/waitForDatabase test/index
}

case "$cmd" in
  "build")
    runComposeCommand build osem-api
    exit 0
    ;;
  "logs")
    shift # remove "logs" from $@
    show_logs="true"
    if [[ $logs_service == "all" ]]; then
      logs_service=""
    fi
    ;;
  "dont_clean_up")
    dont_clean_up="true"
    ;;
  "only_models")
    only_models_tests="true"
    ;;
esac

executeTests
