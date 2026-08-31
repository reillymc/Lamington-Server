import type { Knex } from "knex";

export const up = async (knex: Knex): Promise<void> => {
    await knex.schema.alterTable("attachment", (table) => {
        table.text("preview").nullable();
    });
};

export const down = async (knex: Knex): Promise<void> => {
    await knex.schema.alterTable("attachment", (table) => {
        table.dropColumn("preview");
    });
};
