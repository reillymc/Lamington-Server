import type { Knex } from "knex";

const ON_UPDATE_TIMESTAMP_FUNCTION = `
    CREATE OR REPLACE FUNCTION on_update_timestamp()
    RETURNS trigger AS $$
    BEGIN
        NEW."updatedAt" = now();
        RETURN NEW;
    END;
$$ language 'plpgsql';
`;

export const up = (knex: Knex): Promise<void> =>
    knex.raw(ON_UPDATE_TIMESTAMP_FUNCTION);

export const down = (knex: Knex): Promise<void> =>
    knex.raw("DROP FUNCTION on_update_timestamp;");
