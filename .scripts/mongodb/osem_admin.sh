#!/bin/bash

USER=${OSEM_dbuser:-"admin"}
DATABASE=OSeM-api
PASS=${OSEM_dbuserpass:-"admin"}

echo "Creating openSenseMap Admin user..."
mongo OSeM-api --host localhost --eval "db.createUser({user: '$USER', pwd: '$PASS', roles: ['readWrite', 'dbAdmin']});"
echo "openSenseMap Admin user created."