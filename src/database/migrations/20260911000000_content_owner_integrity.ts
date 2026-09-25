import type { Knex } from "knex";

export const up = async (knex: Knex): Promise<void> => {
    // Make ingredient deletion cascade to list items, so purging
    // orphaned ingredients below cannot be blocked
    await knex.schema.alterTable("list_item", (table) => {
        table.dropForeign("ingredientId", "list_item_ingredientid_foreign");
        table
            .foreign("ingredientId", "list_item_ingredientid_foreign")
            .references("ingredientId")
            .inTable("ingredient")
            .onDelete("CASCADE")
            .onUpdate("CASCADE");
    });

    await knex("content").whereNull("createdBy").delete();
    await knex("attachment").whereNull("createdBy").delete();

    // `dropNullable` drops the nullable property (SET NOT NULL).
    await knex.schema.alterTable("content", (table) => {
        table.dropForeign("createdBy", "content_createdby_foreign");
        table.dropNullable("createdBy");
        table
            .foreign("createdBy", "content_createdby_foreign")
            .references("userId")
            .inTable("user")
            .onDelete("CASCADE")
            .onUpdate("CASCADE");
    });

    await knex.schema.alterTable("attachment", (table) => {
        table.dropForeign("createdBy", "attachment_createdby_foreign");
        table.dropNullable("createdBy");
        table
            .foreign("createdBy", "attachment_createdby_foreign")
            .references("userId")
            .inTable("user")
            .onDelete("CASCADE")
            .onUpdate("CASCADE");
    });
};

export const down = async (knex: Knex): Promise<void> => {
    // `setNullable` restores the nullable property (DROP NOT NULL).
    await knex.schema.alterTable("attachment", (table) => {
        table.dropForeign("createdBy", "attachment_createdby_foreign");
        table.setNullable("createdBy");
        table
            .foreign("createdBy", "attachment_createdby_foreign")
            .references("userId")
            .inTable("user")
            .onDelete("SET NULL")
            .onUpdate("CASCADE");
    });

    await knex.schema.alterTable("content", (table) => {
        table.dropForeign("createdBy", "content_createdby_foreign");
        table.setNullable("createdBy");
        table
            .foreign("createdBy", "content_createdby_foreign")
            .references("userId")
            .inTable("user")
            .onDelete("SET NULL")
            .onUpdate("CASCADE");
    });

    await knex.schema.alterTable("list_item", (table) => {
        table.dropForeign("ingredientId", "list_item_ingredientid_foreign");
        table
            .foreign("ingredientId", "list_item_ingredientid_foreign")
            .references("ingredientId")
            .inTable("ingredient")
            .onDelete("NO ACTION")
            .onUpdate("CASCADE");
    });
};
