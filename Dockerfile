FROM node:6-alpine

# taken from node:6-onbuild
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
COPY yarn.lock /usr/src/app/

# npm rebuild is required because the prebuilt binaries are not compatible with musl
# remove when https://github.com/kelektiv/node.bcrypt.js/issues/528 is resolved
RUN yarn install --pure-lockfile \
 && apk --no-cache --virtual .build add build-base python \
 && npm rebuild bcrypt --build-from-source \
 && apk del .build
COPY . /usr/src/app

# for git 2.1.4
RUN apk --no-cache --virtual .git add git \
  && echo -n $(git rev-parse --abbrev-ref HEAD) $(TZ=UTC git log --date=local --pretty=format:"%ct %h" -n 1) > revision \
  && rm -rf .git \
  && apk del .git

CMD [ "npm", "start" ]
