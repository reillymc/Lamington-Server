# Build stage
FROM node:24-bullseye AS build

RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json .
COPY tools/Scripts/generate_specs.ts ./tools/Scripts/generate_specs.ts
COPY specs ./specs

RUN npm ci

COPY . .

# Production stage
FROM node:24-alpine AS production

WORKDIR /home/node/app

COPY package*.json .
COPY tools/Scripts/generate_specs.ts ./tools/Scripts/generate_specs.ts

RUN npm ci --omit=dev

COPY specs ./specs
COPY --from=build /home/node/app/LICENCE ./LICENCE
COPY --from=build /home/node/app/src ./src

RUN chown -R node:node /home/node/app

USER node

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "prod"]

HEALTHCHECK --interval=10s --timeout=3s --retries=5 --start-period=30s \
  CMD wget -qO- http://localhost:${PORT:-3000}/health || exit 1
