# AGENTS.md

Guidance for coding agents working in this repository.

## Structure

- `routes` — HTTP boundary and OpenAPI response mapping
- `services` — application/use-case orchestration, one service per route domain
- `repositories` — persistence abstractions and adapters (Knex, local disk, object storage)
- `integrations` — outbound remote-system adapters
- `middleware` — Express request pipeline concerns
- `jobs` — background and startup work
- `utils` — general-purpose helpers

Dependencies point inward: routes depend on services; services depend on
repository interfaces and type-only integration ports. Concrete repositories
and integrations are constructed in the composition root (`src/index.ts`).
Integrations must not import routes, services, repositories, middleware or jobs.

## Quality checks

The pipeline (`.github/workflows/build.yml`) gates changes on Biome, TypeScript,
Knip and the test suite. The same checks run continuously as VS Code background
tasks and write their output to files under `.quality/logs/` so agents can read
them:

| Check      | Log file                       | Pipeline equivalent              |
| ---------- | ------------------------------ | -------------------------------- |
| Biome      | `.quality/logs/lint.log`       | `biome ci . --error-on-warnings` |
| TypeScript | `.quality/logs/typecheck.log`  | `npm run typecheck`              |
| Knip       | `.quality/logs/knip.log`       | `npm run knip`                   |
| Tests      | `.quality/logs/tests.log`      | `npm run test:coverage`          |
| OpenAPI    | `.quality/logs/spec.log`       | `npm ci` (postinstall)           |

These logs only update while the folder is open in VS Code. A log is **fresh**
only when its modification time is newer than the most recent change under
`src/`, `tests/` or the relevant config files. Never trust a stale log.

## Before finishing or pushing

1. Check the logs above and respect their freshness.
2. If any check is stale, missing, or failing, run the checks yourself:

   ```sh
   npm run quality:check   # lint + typecheck + knip
   npm run test:coverage   # requires the dev/testing database
   ```

3. Do not finish or push while any of these checks fail. Fix the issue, or, if
   it is pre-existing and out of scope, report the exact failing output instead
   of hiding it.
