#!/bin/bash

USER=${OSEM_dbuser:-"admin"}
DATABASE=OSeM-api
PASS=${OSEM_dbuserpass:-"admin"}

echo "Going to restore openSenseMap measurements export"
mongorestore --db OSeM-api --username $USER --password $PASS --authenticationDatabase OSeM-api --gzip --archive=./exports/measurements
echo "Export was restored"