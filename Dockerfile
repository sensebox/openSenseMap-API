FROM node:6

# taken from node:6-onbuild
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN npm install -g yarn

COPY package.json /usr/src/app/
COPY yarn.lock /usr/src/app/
RUN yarn install
COPY . /usr/src/app

# for git 2.1.4
RUN echo -n $(git rev-parse --abbrev-ref HEAD) $(TZ=UTC git log --date=local --pretty=format:"%ct %h" -n 1) > revision; rm -rf .git

CMD [ "npm", "start" ]
