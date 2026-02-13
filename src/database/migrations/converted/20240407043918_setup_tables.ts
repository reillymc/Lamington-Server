import type { Knex } from "knex";

export const tables = {
    book: "book",
    bookMember: "book_member",
    bookRecipe: "book_recipe",
    ingredient: "ingredient",
    list: "list",
    listItem: "list_item",
    listMember: "list_member",
    planner: "planner",
    plannerMember: "planner_member",
    plannerMeal: "planner_meal",
    recipe: "recipe",
    recipeIngredient: "recipe_ingredient",
    recipeRating: "recipe_rating",
    recipeNote: "recipe_note",
    recipeSection: "recipe_section",
    recipeStep: "recipe_step",
    recipeTag: "recipe_tag",
    tag: "tag",
    user: "user",
} as const;

export type tables = (typeof tables)[keyof typeof tables];

const onUpdateTrigger = (table: tables) => `
    CREATE TRIGGER "${table}_updatedAt"
    BEFORE UPDATE ON "${table}"
    FOR EACH ROW
    EXECUTE PROCEDURE on_update_timestamp();
`;

export const up = async (knex: Knex): Promise<void> =>
    knex.schema
        .createTable(tables.user, (table) => {
            table.uuid("userId", { primaryKey: true });
            table.string("email", 255).notNullable().unique();
            table.string("firstName", 255).notNullable();
            table.string("lastName", 255).notNullable();
            table.string("password", 255).notNullable();
            table.text("status").notNullable().defaultTo("P");
            table.jsonb("preferences");
            table.timestamps(true, true, true);
        })
        .createTable(tables.recipe, (table) => {
            table.uuid("recipeId", { primaryKey: true });
            table.string("name", 255).notNullable();
            table.string("source", 255);
            table.text("summary");
            table.text("tips");
            table.string("photo", 255);
            table.jsonb("servings");
            table.smallint("prepTime");
            table.smallint("cookTime");
            table.jsonb("nutritionalInformation");
            table.boolean("public").defaultTo(false);
            table
                .uuid("createdBy")
                .references("userId")
                .inTable(tables.user)
                .onDelete("SET NULL")
                .onUpdate("SET NULL");
            table.smallint("timesCooked").defaultTo(0);
            table.timestamps(true, true, true);
        })
        .createTable(tables.recipeRating, (table) => {
            table
                .uuid("recipeId")
                .references("recipeId")
                .inTable(tables.recipe)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table
                .uuid("raterId")
                .references("userId")
                .inTable(tables.user)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table.integer("rating").notNullable();
            table.primary(["recipeId", "raterId"]);
        })
        .createTable(tables.recipeNote, (table) => {
            table.uuid("noteId", { primaryKey: true });
            table
                .uuid("recipeId")
                .references("recipeId")
                .inTable(tables.recipe)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table
                .uuid("authorId")
                .references("userId")
                .inTable(tables.user)
                .onDelete("SET NULL")
                .onUpdate("CASCADE");
            table.string("title", 255);
            table.text("content");
            table.boolean("public").defaultTo(false);
            table
                .uuid("parentId")
                .references("noteId")
                .inTable(tables.recipeNote)
                .onDelete("SET NULL")
                .onUpdate("CASCADE");
            table.timestamps(true, true, true);
        })
        .createTable(tables.tag, (table) => {
            table.uuid("tagId", { primaryKey: true });
            table.string("name", 255).notNullable();
            table.string("description", 255);
            table
                .uuid("parentId")
                .references("tagId")
                .inTable(tables.tag)
                .onDelete("CASCADE")
                .onUpdate("NO ACTION");
        })
        .createTable(tables.recipeTag, (table) => {
            table
                .uuid("recipeId")
                .references("recipeId")
                .inTable(tables.recipe)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table
                .uuid("tagId")
                .references("tagId")
                .inTable(tables.tag)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table.primary(["recipeId", "tagId"]);
        })
        .createTable(tables.ingredient, (table) => {
            table.uuid("ingredientId", { primaryKey: true });
            table.string("name", 255).notNullable();
            table.string("description");
            table.string("photo", 255);
            table
                .uuid("createdBy")
                .references("userId")
                .inTable(tables.user)
                .onDelete("SET NULL")
                .onUpdate("CASCADE");
        })
        .createTable(tables.recipeSection, (table) => {
            table
                .uuid("recipeId")
                .references("recipeId")
                .inTable(tables.recipe)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table.uuid("sectionId");
            table.tinyint("index").notNullable();
            table.string("name", 255);
            table.string("description", 255);
            table.unique(["recipeId", "sectionId"]);
            table.primary(["recipeId", "sectionId"]);
        })
        .createTable(tables.recipeIngredient, (table) => {
            table.uuid("id", { primaryKey: true });
            table.uuid("recipeId");
            table.uuid("sectionId");
            table
                .uuid("ingredientId")
                .references("ingredientId")
                .inTable(tables.ingredient)
                .onDelete("RESTRICT")
                .onUpdate("CASCADE");
            table
                .uuid("subrecipeId")
                .references("recipeId")
                .inTable(tables.recipe)
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
                .inTable(tables.recipeSection)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
        })
        .createTable(tables.recipeStep, (table) => {
            table.uuid("id");
            table.uuid("recipeId");
            table.uuid("sectionId");
            table.tinyint("index").notNullable();
            table.text("description");
            table.string("photo", 255);
            table.primary(["id", "recipeId"]);
            table
                .foreign(["recipeId", "sectionId"])
                .references(["recipeId", "sectionId"])
                .inTable(tables.recipeSection)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
        })
        .createTable(tables.list, (table) => {
            table.uuid("listId", { primaryKey: true });
            table.string("name", 255).notNullable();
            table
                .uuid("createdBy")
                .references("userId")
                .inTable(tables.user)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table.jsonb("customisations");
            table.string("description", 255);
        })
        .createTable(tables.listItem, (table) => {
            table.uuid("itemId");
            table
                .uuid("listId")
                .references("listId")
                .inTable(tables.list)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table.string("name", 255).notNullable();
            table.boolean("completed").defaultTo(false);
            table
                .uuid("ingredientId")
                .references("ingredientId")
                .inTable(tables.ingredient)
                .onDelete("NO ACTION")
                .onUpdate("CASCADE");
            table.string("unit", 45);
            table.jsonb("amount");
            table.string("notes", 255);
            table
                .uuid("createdBy")
                .references("userId")
                .inTable(tables.user)
                .onDelete("NO ACTION")
                .onUpdate("NO ACTION");
            table.primary(["listId", "itemId"]);
            table.timestamps(true, true, true);
        })
        .createTable(tables.listMember, (table) => {
            table
                .uuid("listId")
                .references("listId")
                .inTable(tables.list)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table
                .uuid("userId")
                .references("userId")
                .inTable(tables.user)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table.text("status").notNullable().defaultTo("P");
            table.primary(["listId", "userId"]);
        })
        .createTable(tables.book, (table) => {
            table.uuid("bookId", { primaryKey: true });
            table
                .uuid("createdBy")
                .references("userId")
                .inTable(tables.user)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table.string("name", 255);
            table.jsonb("customisations");
            table.string("description", 255);
        })
        .createTable(tables.bookRecipe, (table) => {
            table
                .uuid("bookId")
                .references("bookId")
                .inTable(tables.book)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table
                .uuid("recipeId")
                .references("recipeId")
                .inTable(tables.recipe)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table.primary(["bookId", "recipeId"]);
        })
        .createTable(tables.bookMember, (table) => {
            table
                .uuid("bookId")
                .references("bookId")
                .inTable(tables.book)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table
                .uuid("userId")
                .references("userId")
                .inTable(tables.user)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table.text("status").notNullable().defaultTo("P");
            table.primary(["bookId", "userId"]);
        })
        .createTable(tables.planner, (table) => {
            table.uuid("plannerId", { primaryKey: true });
            table
                .uuid("createdBy")
                .references("userId")
                .inTable(tables.user)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table.string("name", 255).notNullable();
            table.jsonb("customisations");
            table.string("description", 255);
        })
        .createTable(tables.plannerMeal, (table) => {
            table.uuid("id").primary();
            table
                .uuid("plannerId")
                .references("plannerId")
                .inTable(tables.planner)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table
                .uuid("createdBy")
                .references("userId")
                .inTable(tables.user)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table.smallint("year");
            table.tinyint("month");
            table.tinyint("dayOfMonth");
            table.string("meal", 45).notNullable();
            table.tinyint("type").notNullable().defaultTo(0);
            table.string("description", 255);
            table.string("source", 255);
            table.tinyint("sequence");
            table
                .uuid("recipeId")
                .references("recipeId")
                .inTable(tables.recipe)
                .onDelete("SET NULL")
                .onUpdate("SET NULL");
            table.string("notes", 255);
        })
        .createTable(tables.plannerMember, (table) => {
            table
                .uuid("plannerId")
                .references("plannerId")
                .inTable(tables.planner)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table
                .uuid("userId")
                .references("userId")
                .inTable(tables.user)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table.text("status").notNullable().defaultTo("P");
            table.primary(["plannerId", "userId"]);
        })
        .then(() => knex.raw(onUpdateTrigger(tables.user)))
        .then(() => knex.raw(onUpdateTrigger(tables.recipe)))
        .then(() => knex.raw(onUpdateTrigger(tables.recipeNote)))
        .then(() => knex.raw(onUpdateTrigger(tables.listItem)));

export const down = async (knex: Knex): Promise<void> =>
    knex.schema
        .dropTable(tables.bookMember)
        .dropTable(tables.listMember)
        .dropTable(tables.plannerMember)
        .dropTable(tables.listItem)
        .dropTable(tables.recipeTag)
        .dropTable(tables.bookRecipe)
        .dropTable(tables.plannerMeal)
        .dropTable(tables.recipeRating)
        .dropTable(tables.recipeIngredient)
        .dropTable(tables.recipeStep)
        .dropTable(tables.recipeSection)
        .dropTable(tables.recipeNote)
        .dropTable(tables.tag)
        .dropTable(tables.book)
        .dropTable(tables.ingredient)
        .dropTable(tables.list)
        .dropTable(tables.planner)
        .dropTable(tables.recipe)
        .dropTable(tables.user);
