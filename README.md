# Lamington-Server

Lamington is a recipe book, meal planner and shopping list in one. This repository contains the code for the Node backend powering Lamington.

## Development

Development for Lamington Server is done within the dev container setup defined in `.devcontainer`. A `.env` file conforming to the [example env file](./.devcontainer/.env.example) must be setup in this directory before opening the container:

```diff
+ .devcontainer/.env
```

## Deployment

Deploying Lamington Server is simple with just a few steps to get set up. A `.env` file conforming to the [example env file](./.env.example) must be setup in the project directory before running the docker setup:

```diff
+ .env
```

The server runs with a read-only root filesystem, so create the writable data directories and give them to the container `node` user (UID `1000`):

```sh
mkdir -p lamington-data/{uploads,logs,assets,db}
sudo chown -R 1000:1000 lamington-data/uploads lamington-data/logs lamington-data/assets
```

See the [example env file](./.env.example) for details on required and optional variables.

### Logs

The server logs to stdout/stderr, which Docker captures and exposes through `docker compose logs`, and to rotating files in `LOG_DIRECTORY` (default `logs`).

View recent logs:

```sh
docker compose logs -f lamington_server
docker compose logs --since 1h -t lamington_server
```

For longer-term history, see the bind-mounted files:

- `./lamington-data/logs/error-*.log`
- `./lamington-data/logs/access-*.log`

### Recipe extraction

Recipe extraction is handled by the [`Lamington-Extractor`](https://github.com/reillymc/Lamington-Extractor) sidecar. Set `EXTRACTOR_URL` to its URL and set `EXTRACTOR_API_KEY`. The key is mandatory in production. The server starts without the sidecar; extraction endpoints return `503 EXTRACTOR_UNAVAILABLE` until it is available. A high-entropy key is strongly recommended; generate 32 random bytes with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

or:

```sh
openssl rand -hex 32
```
