FROM node:6

# taken from node:6-onbuild
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN npm install -g yarn

COPY package.json /usr/src/app/
COPY yarn.lock /usr/src/app/
RUN yarn install --production
COPY . /usr/src/app

CMD [ "npm", "start" ]
