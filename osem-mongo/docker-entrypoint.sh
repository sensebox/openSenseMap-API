#!/bin/bash
set -e

if [ "${1:0:1}" = '-' ]; then
	set -- mongod "$@"
fi

# allow the container to be started with `--user`
if [ "$1" = 'mongod' -a "$(id -u)" = '0' ]; then
	chown -R mongodb /data/configdb /data/db
	exec gosu mongodb "$BASH_SOURCE" "$@"
fi

if [ "$1" = 'mongod' ]; then
	numa='numactl --interleave=all'
	if $numa true &> /dev/null; then
		set -- $numa "$@"
	fi
fi

# taken from the tutumcloud mongo image..
if [ ! -f /data/db/.mongodb_password_set ]; then
#	mongod &
#mongod --config << EOF
#bind_ip=127.0.0.1
#EOF
	mongod --bind_ip 127.0.0.1 &
	PID=$!
	/set_mongodb_password.sh
	kill $PID
	wait $PID
	exec "$@"
else
	exec "$@"
fi

