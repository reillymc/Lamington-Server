# Lamington-Server

Lamington is a recipe book, meal planner and shopping list in one. This repository contains the code for the Node backend powering Lamington.

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
