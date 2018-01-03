FROM node:8-alpine as build

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

# npm rebuild is required because the prebuilt binaries are not compatible with musl
# remove when https://github.com/kelektiv/node.bcrypt.js/issues/528 is resolved
RUN yarn install --pure-lockfile --production \
  && npm rebuild bcrypt --build-from-source \
COPY . /usr/src/app

# for git 2.1.4
RUN echo -n $(git rev-parse --abbrev-ref HEAD) $(TZ=UTC git log --date=local --pretty=format:"%ct %h" -n 1) > revision \
  && rm -rf .git

# Final stage
FROM node:8-alpine

WORKDIR /usr/src/app
COPY --from=build /usr/src/app /usr/src/app

CMD [ "yarn", "start" ]
