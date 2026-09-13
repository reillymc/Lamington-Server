import type { Knex } from "knex";

const ORPHANED_ATTACHMENT_FUNCTION = `
    CREATE OR REPLACE FUNCTION mark_orphaned_attachment_deleted()
    RETURNS trigger AS $$
    BEGIN
        PERFORM 1
        FROM "attachment"
        WHERE "attachmentId" = OLD."attachmentId"
        FOR UPDATE SKIP LOCKED;

        IF NOT FOUND THEN
            RETURN NULL;
        END IF;

        UPDATE "attachment"
        SET "deletedAt" = now()
        WHERE "attachmentId" = OLD."attachmentId"
          AND "deletedAt" IS NULL
          AND NOT EXISTS (
              SELECT 1
              FROM "content_attachment"
              WHERE "attachmentId" = OLD."attachmentId"
          );
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
`;

const PLANNER_MEAL_CONTENT_FUNCTION = `
    CREATE OR REPLACE FUNCTION delete_planner_meal_content()
    RETURNS trigger AS $$
    BEGIN
        DELETE FROM "content" WHERE "contentId" = OLD."mealId";
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
`;

const LIST_ITEM_CONTENT_FUNCTION = `
    CREATE OR REPLACE FUNCTION delete_list_item_content()
    RETURNS trigger AS $$
    BEGIN
        DELETE FROM "content" WHERE "contentId" = OLD."itemId";
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
`;

const CONTENT_NOTE_CONTENT_FUNCTION = `
    CREATE OR REPLACE FUNCTION delete_content_note_content()
    RETURNS trigger AS $$
    BEGIN
        DELETE FROM "content" WHERE "contentId" = OLD."noteId";
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
`;

export const up = async (knex: Knex): Promise<void> => {
    await knex.schema.alterTable("attachment", (table) => {
        table.timestamp("deletedAt", { useTz: true }).nullable();
        table.dropColumn("uri");
    });

    await knex.raw(`
        CREATE INDEX "attachment_deletedAt_idx"
        ON "attachment" ("deletedAt")
        WHERE "deletedAt" IS NOT NULL;
    `);

    await knex.raw(`
        CREATE INDEX "attachment_createdAt_idx"
        ON "attachment" ("createdAt")
        WHERE "deletedAt" IS NULL;
    `);

    // Backfill attachments orphaned before the trigger existed: rows with
    // no content_attachment links were previously left active forever.
    await knex.raw(`
        UPDATE "attachment"
        SET "deletedAt" = now()
        WHERE "deletedAt" IS NULL
          AND "createdAt" < now() - interval '24 hours'
          AND NOT EXISTS (
              SELECT 1
              FROM "content_attachment"
              WHERE "content_attachment"."attachmentId" = "attachment"."attachmentId"
          );
    `);

    await knex.schema.alterTable("user", (table) => {
        table.timestamp("deletedAt", { useTz: true }).nullable();
    });

    await knex.raw(`
        CREATE INDEX "user_deletedAt_idx"
        ON "user" ("deletedAt")
        WHERE "deletedAt" IS NOT NULL;
    `);

    await knex.raw(`
        CREATE INDEX "planner_meal_plannerId_idx"
        ON "planner_meal" ("plannerId");
    `);

    await knex.raw(`
        CREATE INDEX "list_item_listId_idx"
        ON "list_item" ("listId");
    `);

    await knex.raw(ORPHANED_ATTACHMENT_FUNCTION);
    await knex.raw(`
        CREATE TRIGGER "content_attachment_orphaned_deletedAt"
        AFTER DELETE ON "content_attachment"
        FOR EACH ROW
        EXECUTE FUNCTION mark_orphaned_attachment_deleted();
    `);

    await knex.raw(PLANNER_MEAL_CONTENT_FUNCTION);
    await knex.raw(`
        CREATE TRIGGER "planner_meal_content_delete"
        AFTER DELETE ON "planner_meal"
        FOR EACH ROW
        EXECUTE FUNCTION delete_planner_meal_content();
    `);

    await knex.raw(LIST_ITEM_CONTENT_FUNCTION);
    await knex.raw(`
        CREATE TRIGGER "list_item_content_delete"
        AFTER DELETE ON "list_item"
        FOR EACH ROW
        EXECUTE FUNCTION delete_list_item_content();
    `);

    await knex.raw(CONTENT_NOTE_CONTENT_FUNCTION);
    await knex.raw(`
        CREATE TRIGGER "content_note_content_delete"
        AFTER DELETE ON "content_note"
        FOR EACH ROW
        EXECUTE FUNCTION delete_content_note_content();
    `);
};

export const down = async (knex: Knex): Promise<void> => {
    await knex.raw(
        'DROP TRIGGER IF EXISTS "content_note_content_delete" ON "content_note";',
    );
    await knex.raw("DROP FUNCTION IF EXISTS delete_content_note_content();");

    await knex.raw(
        'DROP TRIGGER IF EXISTS "list_item_content_delete" ON "list_item";',
    );
    await knex.raw("DROP FUNCTION IF EXISTS delete_list_item_content();");

    await knex.raw(
        'DROP TRIGGER IF EXISTS "planner_meal_content_delete" ON "planner_meal";',
    );
    await knex.raw("DROP FUNCTION IF EXISTS delete_planner_meal_content();");

    await knex.raw(
        'DROP TRIGGER IF EXISTS "content_attachment_orphaned_deletedAt" ON "content_attachment";',
    );
    await knex.raw(
        "DROP FUNCTION IF EXISTS mark_orphaned_attachment_deleted();",
    );

    await knex.raw('DROP INDEX IF EXISTS "list_item_listId_idx";');
    await knex.raw('DROP INDEX IF EXISTS "planner_meal_plannerId_idx";');
    await knex.raw('DROP INDEX IF EXISTS "user_deletedAt_idx";');
    await knex.raw('DROP INDEX IF EXISTS "attachment_createdAt_idx";');
    await knex.raw('DROP INDEX IF EXISTS "attachment_deletedAt_idx";');

    await knex.schema.alterTable("user", (table) => {
        table.dropColumn("deletedAt");
    });

    await knex.schema.alterTable("attachment", (table) => {
        table.dropColumn("deletedAt");
    });

    await knex.schema.alterTable("attachment", (table) => {
        table.text("uri").notNullable().defaultTo("");
    });

    await knex.raw('ALTER TABLE "attachment" ALTER COLUMN "uri" DROP DEFAULT;');
};
