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

WORKDIR /home/node/app

COPY package*.json .
COPY openapi.yaml .

COPY --from=build /home/node/app/src ./src

RUN chown -R node:node /home/node/app

USER node

RUN npm ci --omit=dev

EXPOSE 3000

CMD ["npm", "run", "prod"]

HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1
