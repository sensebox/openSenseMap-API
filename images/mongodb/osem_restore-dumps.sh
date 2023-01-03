#!/bin/bash

USER=${OSEM_dbuser:-"admin"}
DATABASE=OSeM-api
PASS=${OSEM_dbuserpass:-"admin"}

FILES="/dumps/*"
echo "Going to restore openSenseMap dumps from the path $FILES"
for f in $FILES
do
  echo "Restoring $f dump..."
  # take action on each file. $f store current file name
  mongorestore --db OSeM-api --username $USER --password $PASS --authenticationDatabase OSeM-api --gzip --archive=$f
  echo "Dump $f was restored"
done
echo "Finished restoring all dumps!"