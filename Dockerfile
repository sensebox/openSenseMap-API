# Image selected based on https://snyk.io/blog/choosing-the-best-node-js-docker-image/
# Used best practices from https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/

# --------------> The build image
FROM node:16.18.1-bullseye-slim as build

RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends git dumb-init

WORKDIR /usr/src/app

# Copy in main package.json and yarn.lock
COPY package.json /usr/src/app/
COPY yarn.lock /usr/src/app/

# Copy in workspace package.json files
COPY packages/api/package.json /usr/src/app/packages/api/
COPY packages/models/package.json /usr/src/app/packages/models/

RUN yarn install --pure-lockfile --production

COPY . /usr/src/app

RUN yarn create-version-file \
  && rm -rf .git .scripts

# --------------> The production image
FROM node:16.18.1-bullseye-slim

ENV NODE_ENV=production
COPY --from=build /usr/bin/dumb-init /usr/bin/dumb-init
USER node

WORKDIR /usr/src/app
# COPY --from=build /usr/src/app /usr/src/app
COPY --chown=node:node --from=build /usr/src/app/node_modules /usr/src/app/node_modules
COPY --chown=node:node --from=build /usr/src/app/version.js /usr/src/app/version.js
COPY --chown=node:node . /usr/src/app

CMD ["dumb-init", "node", "packages/api/app.js"]