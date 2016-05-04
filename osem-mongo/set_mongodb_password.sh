#!/bin/bash

USER=${OSEM_dbuser:-"admin"}
DATABASE=OSeM-api
PASS=${OSEM_dbuserpass:-"admin"}

RET=1
while [[ RET -ne 0 ]]; do
    echo "=> Waiting for confirmation of MongoDB service startup"
    sleep 5
    mongo admin --eval "help" >/dev/null 2>&1
    RET=$?
done

echo "=> Creating user ${USER} user with password ${PASS} in MongoDB"
mongo admin << EOF
use OSeM-api
db.addUser({user: '$USER', pwd: '$PASS', roles:['readWrite']})
EOF

echo "=> Done!"
touch /data/db/.mongodb_password_set

