import type { Knex } from "knex";

// Every table whose primary key is a foreign key to content."contentId".
const contentTables = [
    { table: "book", id: "bookId" },
    { table: "content_note", id: "noteId" },
    { table: "ingredient", id: "ingredientId" },
    { table: "list", id: "listId" },
    { table: "list_item", id: "itemId" },
    { table: "planner", id: "plannerId" },
    { table: "planner_meal", id: "mealId" },
    { table: "recipe", id: "recipeId" },
] as const;

const triggerName = (table: string) => `${table}_touch_content`;
const functionName = (table: string) => `touch_${table}_content`;

const touchContentFunction = (table: string, id: string) => `
    CREATE OR REPLACE FUNCTION ${functionName(table)}()
    RETURNS trigger AS $$
    BEGIN
        UPDATE "content" SET "updatedAt" = now() WHERE "contentId" = NEW."${id}";
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
`;

const touchContentTrigger = (table: string) => `
    CREATE TRIGGER "${triggerName(table)}"
    AFTER UPDATE ON "${table}"
    FOR EACH ROW
    EXECUTE FUNCTION ${functionName(table)}();
`;

export const up = async (knex: Knex): Promise<void> => {
    for (const { table, id } of contentTables) {
        await knex.raw(
            `DROP TRIGGER IF EXISTS "${triggerName(table)}" ON "${table}";`,
        );
        await knex.raw(touchContentFunction(table, id));
        await knex.raw(touchContentTrigger(table));
    }
};

export const down = async (knex: Knex): Promise<void> => {
    for (const { table } of contentTables) {
        await knex.raw(
            `DROP TRIGGER IF EXISTS "${triggerName(table)}" ON "${table}";`,
        );
        await knex.raw(`DROP FUNCTION IF EXISTS ${functionName(table)}();`);
    }
};
