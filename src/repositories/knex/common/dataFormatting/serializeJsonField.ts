/**
 * knex has issues binding JS arrays to jsonb columns with the pg driver,
 * which results in double-encoded values: https://github.com/knex/knex/issues/6126.
 *
 * Array json fields must be pre-serialised before insert/update.
 */
export const serializeJsonField = <T>(
    value: T | null | undefined,
): T | null | undefined =>
    value === null || value === undefined
        ? value
        : (JSON.stringify(value) as unknown as T);
