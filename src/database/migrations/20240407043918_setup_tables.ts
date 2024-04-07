import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema
        .createTable("user", table => {
            table.uuid("userId", { primaryKey: true });
            table.string("email", 255).notNullable().unique();
            table.string("firstName", 255).notNullable();
            table.string("lastName", 255).notNullable();
            table.string("password", 255).notNullable();
            table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
            table.tinyint("permissions").notNullable().defaultTo(0);
            table.jsonb("preferences");
        })
        .createTable("recipe", table => {
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
            table.uuid("createdBy").references("userId").inTable("user").onDelete("SET NULL").onUpdate("SET NULL");
            table.smallint("timesCooked").defaultTo(0);
            table.dateTime("dateUpdated").notNullable().defaultTo(knex.fn.now());
            table.dateTime("dateCreated").notNullable().defaultTo(knex.fn.now());
        })
        .createTable("recipe_rating", table => {
            table.uuid("recipeId").references("recipeId").inTable("recipe").onDelete("CASCADE").onUpdate("CASCADE");
            table.uuid("raterId").references("userId").inTable("user").onDelete("CASCADE").onUpdate("CASCADE");
            table.integer("rating").notNullable();
            table.primary(["recipeId", "raterId"]);
        })
        .createTable("recipe_note", table => {
            table.uuid("noteId", { primaryKey: true });
            table.uuid("recipeId").references("recipeId").inTable("recipe").onDelete("CASCADE").onUpdate("CASCADE");
            table.uuid("authorId").references("userId").inTable("user").onDelete("SET NULL").onUpdate("CASCADE");
            table.string("title", 255);
            table.text("content");
            table.boolean("public").defaultTo(false);
            table.dateTime("dateUpdated").notNullable().defaultTo(knex.fn.now());
            table.uuid("parentId").references("noteId").inTable("recipe_note").onDelete("SET NULL").onUpdate("CASCADE");
        })
        .createTable("tag", table => {
            table.uuid("tagId", { primaryKey: true });
            table.string("name", 255).notNullable();
            table.string("description", 255);
            table.uuid("parentId").references("tagId").inTable("tag").onDelete("CASCADE").onUpdate("NO ACTION");
        })
        .createTable("recipe_tag", table => {
            table.uuid("recipeId").references("recipeId").inTable("recipe").onDelete("CASCADE").onUpdate("CASCADE");
            table.uuid("tagId").references("tagId").inTable("tag").onDelete("CASCADE").onUpdate("CASCADE");
            table.primary(["recipeId", "tagId"]);
        })
        .createTable("ingredient", table => {
            table.uuid("ingredientId", { primaryKey: true });
            table.string("name", 255).notNullable();
            table.string("description");
            table.string("photo", 255);
            table.uuid("createdBy").references("userId").inTable("user").onDelete("SET NULL").onUpdate("CASCADE");
        })
        .createTable("recipe_section", table => {
            table.uuid("recipeId").references("recipeId").inTable("recipe").onDelete("CASCADE").onUpdate("CASCADE");
            table.uuid("sectionId").unique();
            table.tinyint("index").notNullable();
            table.string("name", 255);
            table.string("description", 255);
            table.primary(["recipeId", "sectionId"]);
        })
        .createTable("recipe_ingredient", table => {
            table.uuid("id", { primaryKey: true });
            table.uuid("recipeId").references("recipeId").inTable("recipe").onDelete("CASCADE").onUpdate("CASCADE");
            table
                .uuid("sectionId")
                .references("sectionId")
                .inTable("recipe_section")
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table
                .uuid("ingredientId")
                .references("ingredientId")
                .inTable("ingredient")
                .onDelete("RESTRICT")
                .onUpdate("CASCADE");
            table.uuid("subrecipeId").references("recipeId").inTable("recipe").onDelete("SET NULL").onUpdate("CASCADE");
            table.tinyint("index").notNullable();
            table.string("unit", 45);
            table.jsonb("amount");
            table.tinyint("multiplier");
            table.string("description", 255);
        })
        .createTable("recipe_step", table => {
            table.uuid("id", { primaryKey: true });
            table.uuid("recipeId").references("recipeId").inTable("recipe").onDelete("CASCADE").onUpdate("CASCADE");
            table
                .uuid("sectionId")
                .references("sectionId")
                .inTable("recipe_section")
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table.tinyint("index").notNullable();
            table.text("description");
            table.string("photo", 255);
        })
        .createTable("list", table => {
            table.uuid("listId", { primaryKey: true });
            table.string("name", 255).notNullable();
            table.uuid("createdBy").references("userId").inTable("user").onDelete("CASCADE").onUpdate("CASCADE");
            table.jsonb("customisations");
            table.string("description", 255);
        })
        .createTable("list_item", table => {
            table.uuid("itemId", { primaryKey: true });
            table.uuid("listId").references("listId").inTable("list").onDelete("CASCADE").onUpdate("CASCADE");
            table.string("name", 255).notNullable();
            table.dateTime("dateUpdated").notNullable().defaultTo(knex.fn.now());
            table.boolean("completed").defaultTo(false);
            table
                .uuid("ingredientId")
                .references("ingredientId")
                .inTable("ingredient")
                .onDelete("NO ACTION")
                .onUpdate("CASCADE");
            table.string("unit", 45);
            table.jsonb("amount");
            table.string("notes", 255);
            table.uuid("createdBy").references("userId").inTable("user").onDelete("NO ACTION").onUpdate("NO ACTION");
        })
        .createTable("list_member", table => {
            table.uuid("listId").references("listId").inTable("list").onDelete("CASCADE").onUpdate("CASCADE");
            table.uuid("userId").references("userId").inTable("user").onDelete("CASCADE").onUpdate("CASCADE");
            table.tinyint("permissions").notNullable().defaultTo(0);
            table.primary(["listId", "userId"]);
        })
        .createTable("book", table => {
            table.uuid("bookId", { primaryKey: true });
            table.uuid("createdBy").references("userId").inTable("user").onDelete("CASCADE").onUpdate("CASCADE");
            table.string("name", 255);
            table.jsonb("customisations");
            table.string("description", 255);
        })
        .createTable("book_recipe", table => {
            table.uuid("bookId").references("bookId").inTable("book").onDelete("CASCADE").onUpdate("CASCADE");
            table.uuid("recipeId").references("recipeId").inTable("recipe").onDelete("CASCADE").onUpdate("CASCADE");
            table.primary(["bookId", "recipeId"]);
        })
        .createTable("book_member", table => {
            table.uuid("bookId").references("bookId").inTable("book").onDelete("CASCADE").onUpdate("CASCADE");
            table.uuid("userId").references("userId").inTable("user").onDelete("CASCADE").onUpdate("CASCADE");
            table.tinyint("permissions").notNullable().defaultTo(0);
            table.primary(["bookId", "userId"]);
        })
        .createTable("planner", table => {
            table.uuid("plannerId", { primaryKey: true });
            table.uuid("createdBy").references("userId").inTable("user").onDelete("CASCADE").onUpdate("CASCADE");
            table.string("name", 255).notNullable();
            table.jsonb("customisations");
            table.string("description", 255);
        })
        .createTable("planner_meal", table => {
            table.uuid("id", { primaryKey: true });
            table.uuid("plannerId").references("plannerId").inTable("planner").onDelete("CASCADE").onUpdate("CASCADE");
            table.uuid("createdBy").references("userId").inTable("user").onDelete("CASCADE").onUpdate("CASCADE");
            table.smallint("year");
            table.tinyint("month");
            table.tinyint("dayOfMonth");
            table.string("meal", 45).notNullable();
            table.tinyint("type").notNullable().defaultTo(0);
            table.string("description", 255);
            table.string("source", 255);
            table.tinyint("sequence");
            table.uuid("recipeId").references("recipeId").inTable("recipe").onDelete("SET NULL").onUpdate("SET NULL");
            table.string("notes", 255);
        })
        .createTable("planner_member", table => {
            table.uuid("plannerId").references("plannerId").inTable("planner").onDelete("CASCADE").onUpdate("CASCADE");
            table.uuid("userId").references("userId").inTable("user").onDelete("CASCADE").onUpdate("CASCADE");
            table.tinyint("permissions").notNullable().defaultTo(0);
            table.primary(["plannerId", "userId"]);
        });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema
        .dropTable("user")
        .dropTable("recipe")
        .dropTable("recipe_rating")
        .dropTable("recipe_note")
        .dropTable("tag")
        .dropTable("recipe_tag")
        .dropTable("ingredient")
        .dropTable("recipe_section")
        .dropTable("recipe_ingredient")
        .dropTable("recipe_step")
        .dropTable("list")
        .dropTable("list_item")
        .dropTable("list_member")
        .dropTable("book")
        .dropTable("book_recipe")
        .dropTable("book_member")
        .dropTable("planner")
        .dropTable("planner_meal")
        .dropTable("planner_member");
}
