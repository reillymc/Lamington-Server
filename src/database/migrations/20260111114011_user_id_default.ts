import type { Knex } from "knex";

export const up = async (knex: Knex): Promise<void> => {
    await knex.raw(`
        ALTER TABLE "user"
        ALTER COLUMN "userId"
        SET DEFAULT gen_random_uuid()
  `);
};

export const down = async (knex: Knex): Promise<void> => {
    await knex.raw(`
        ALTER TABLE "user"
        ALTER COLUMN "userId"
        DROP DEFAULT
  `);
};
