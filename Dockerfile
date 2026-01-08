# Build stage
FROM node:24-bullseye AS build

RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json .
COPY openapi.yaml .

RUN npm install

COPY . .

# Production stage
FROM node:24-alpine AS production

RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json .
COPY openapi.yaml .

USER node

RUN npm ci --only=production

COPY --from=build /home/node/app/src ./src

EXPOSE 3000

CMD npm run prod
