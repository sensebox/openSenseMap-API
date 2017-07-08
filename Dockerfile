FROM node:6-alpine

RUN apk --no-cache --virtual .build add python make g++ git

# taken from node:6-onbuild
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
COPY yarn.lock /usr/src/app/
RUN yarn install --pure-lockfile
# required because the prebuilt binaries are not compatible with musl
# remove when https://github.com/kelektiv/node.bcrypt.js/issues/528 is resolved
RUN npm rebuild bcrypt --build-from-source
COPY . /usr/src/app

# for git 2.1.4
RUN echo -n $(git rev-parse --abbrev-ref HEAD) $(TZ=UTC git log --date=local --pretty=format:"%ct %h" -n 1) > revision; rm -rf .git

RUN apk del .build

CMD [ "npm", "start" ]
