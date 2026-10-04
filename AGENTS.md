# AGENTS.md

Guidance for coding agents working in this repository.

## Quality checks

The pipeline (`.github/workflows/build.yml`) gates changes on Biome, TypeScript,
Knip and the test suite. The same checks run continuously as VS Code background
tasks and write their output to files under `.quality/logs/` so agents can read
them:

| Check      | Log file                       | Pipeline equivalent            |
| ---------- | ------------------------------ | ------------------------------ |
| Biome      | `.quality/logs/lint.log`       | `biome ci . --error-on-warnings` |
| TypeScript | `.quality/logs/typecheck.log`  | `npm run typecheck`            |
| Knip       | `.quality/logs/knip.log`       | `npm run knip`                 |
| Tests      | `.quality/logs/tests.log`      | `npm run test:coverage`        |
| OpenAPI    | `.quality/logs/spec.log`       | `npm run generate:spec`        |

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
