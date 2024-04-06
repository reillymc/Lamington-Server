FROM node:20-bullseye

RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

WORKDIR /home/node/app

USER node

COPY package*.json .
RUN npm ci

COPY dist ./src

EXPOSE 3000

CMD npm run prod
