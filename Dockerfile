# Build stage
FROM node:20-bullseye AS build

RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json .

RUN npm install

COPY . .

RUN npm run build

# Production stage
FROM node:20-alpine AS production

RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json .

USER node

RUN npm ci --only=production

COPY --from=build /home/node/app/dist ./dist

EXPOSE 3000

CMD npm run prod
