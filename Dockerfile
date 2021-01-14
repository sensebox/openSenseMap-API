FROM node:15-alpine as build

ENV NODE_ENV=production

RUN apk --no-cache --virtual .build add build-base python git

# taken from node:6-onbuild
#RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# copy in main package.json and yarn.lock
COPY package.json /usr/src/app/
COPY yarn.lock /usr/src/app/
# copy in workspace package.json files
COPY packages/api/package.json /usr/src/app/packages/api/
COPY packages/models/package.json /usr/src/app/packages/models/

RUN yarn install --pure-lockfile --production

COPY . /usr/src/app

RUN yarn create-version-file \
  && rm -rf .git .scripts

# Final stage
FROM node:15-alpine

ENV NODE_ENV=production

WORKDIR /usr/src/app
COPY --from=build /usr/src/app /usr/src/app

CMD [ "yarn", "start" ]
