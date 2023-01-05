
#!/bin/bash

USER=${OSEM_dbuser:-"admin"}
DATABASE=OSeM-api
PASS=${OSEM_dbuserpass:-"admin"}

echo "Going to restore openSenseMap boxes export"
mongorestore --db OSeM-api --username $USER --password $PASS --authenticationDatabase OSeM-api --gzip --archive=./exports/boxes
echo "Export was restored"