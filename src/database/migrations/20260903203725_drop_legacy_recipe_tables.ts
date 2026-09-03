import type { Knex } from "knex";

export const up = async (knex: Knex): Promise<void> => {
    await knex.schema.dropTableIfExists("recipe_step_legacy");
    await knex.schema.dropTableIfExists("recipe_ingredient_legacy");
    await knex.schema.dropTableIfExists("recipe_section_legacy");
};

export const down = async (knex: Knex): Promise<void> => {
    await knex.schema.createTable("recipe_section_legacy", (table) => {
        table
            .uuid("recipeId")
            .references("recipeId")
            .inTable("recipe")
            .onDelete("CASCADE")
            .onUpdate("CASCADE");
        table.uuid("sectionId");
        table.tinyint("index").notNullable();
        table.string("name", 255);
        table.string("description", 255);
        table.unique(["recipeId", "sectionId"]);
        table.primary(["recipeId", "sectionId"]);
    });

    await knex.schema.createTable("recipe_step_legacy", (table) => {
        table.uuid("id");
        table.uuid("recipeId");
        table.uuid("sectionId");
        table.tinyint("index").notNullable();
        table.text("description");
        table.primary(["id", "recipeId"]);
        table
            .foreign(["recipeId", "sectionId"])
            .references(["recipeId", "sectionId"])
            .inTable("recipe_section_legacy")
            .onDelete("CASCADE")
            .onUpdate("CASCADE");
    });

    await knex.schema.createTable("recipe_ingredient_legacy", (table) => {
        table.uuid("id", { primaryKey: true });
        table.uuid("recipeId");
        table.uuid("sectionId");
        table
            .uuid("ingredientId")
            .references("ingredientId")
            .inTable("ingredient")
            .onDelete("RESTRICT")
            .onUpdate("CASCADE");
        table
            .uuid("subrecipeId")
            .references("recipeId")
            .inTable("recipe")
            .onDelete("SET NULL")
            .onUpdate("CASCADE");
        table.tinyint("index").notNullable();
        table.string("unit", 45);
        table.jsonb("amount");
        table.tinyint("multiplier");
        table.string("description", 255);
        table.primary(["id", "recipeId"]);
        table
            .foreign(["recipeId", "sectionId"])
            .references(["recipeId", "sectionId"])
            .inTable("recipe_section_legacy")
            .onDelete("CASCADE")
            .onUpdate("CASCADE");
    });
};
