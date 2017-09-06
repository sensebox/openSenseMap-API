#!/bin/bash

set -e

export OSEM_mailer_cert=$(cat /home/gerald/code/sensebox-mailer/client_cert.pem)
export OSEM_mailer_key=$(cat /home/gerald/code/sensebox-mailer/client_key.pem)
export OSEM_mailer_ca=$(cat /home/gerald/code/sensebox-mailer/ca_cert.pem)
export OSEM_mailer_url="https://localhost:3924"
export OSEM_mailer_origin="locahost"

node 2-node-make-users-unique.js
