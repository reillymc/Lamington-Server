# Lamington-Server

A node server for the Lamington app

## Technologies

-   Nodejs
-   Express
-   TypeScript

## Development

Development for Lamington Server is done within the dev container setup defined in `.devcontainer`. A `.env` file conforming to the [example env file](./.env.example) must be setup in this directory before opening the container:

```diff
+ .devcontainer/.env
```

See the [example env file](./.env.example) for details on required and optional variables.

## Deployment

Deploying Lamington Server is simple with just a few steps to get set up. A `.env` file conforming to the [example env file](./.env.example) must be setup in the project directory before running the docker setup:

```diff
+ .env
```

See the [example env file](./.env.example) for details on required and optional variables.

