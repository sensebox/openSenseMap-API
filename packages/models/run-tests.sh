#!/bin/bash
set -euo pipefail

# Disclaimer: I am no bash wizard

dont_clean_up=${dont_clean_up:-}
show_logs=${show_logs:-}

function runComposeCommand {
  docker-compose -p osemmodelstest -f ./test/docker-compose.yml "$@"
}

cmd=${1:-}
logs_service=${2:-}

case "$cmd" in
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
      runComposeCommand logs
    else
      runComposeCommand logs "$logs_service"
    fi
  fi

  if [[ -z "$dont_clean_up" ]]; then
    echo 'cleanup!'
    runComposeCommand down -v
  fi
}
trap cleanup EXIT

runComposeCommand down -v

runComposeCommand up -d db
runComposeCommand run --rm test-runner
