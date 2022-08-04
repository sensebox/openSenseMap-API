FROM mongo:5

LABEL org.opencontainers.image.source https://github.com/sensebox/openSenseMap-API/tree/master/images/mongodb
LABEL org.opencontainers.image.description "MongoDB development database for openSenseMap API"

COPY ./osem_admin.sh /docker-entrypoint-initdb.d
