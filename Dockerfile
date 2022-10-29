FROM node:latest

WORKDIR /

COPY package.json .
RUN npm install -g nodemon typescript
RUN npm install
COPY . .
CMD npm start