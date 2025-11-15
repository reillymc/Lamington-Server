import type { Knex } from "knex";
import { tables } from "./20240407043918_setup_tables.ts";
import { UserStatus } from "../../routes/spec/user.ts";

export const newTables = {
    content: "content",
    attachment: "attachment",
    contentAttachment: "content_attachment",
    contentNote: "content_note",
    contentTag: "content_tag",
    contentMember: "content_member",
} as const;

const migratingTables = [
    {
        name: tables.recipe,
        id: "recipeId",
        photoColumn: "photo",
        hasCreatedAt: true,
        hasUpdatedAt: true,
    },
    {
        name: tables.book,
        id: "bookId",
        hasCreatedAt: false,
        hasUpdatedAt: false,
    },
    {
        name: tables.ingredient,
        id: "ingredientId",
        photoColumn: "photo",
        hasCreatedAt: false,
        hasUpdatedAt: false,
    },
    {
        name: tables.list,
        id: "listId",
        hasCreatedAt: false,
        hasUpdatedAt: false,
    },
    {
        name: tables.listItem,
        id: "itemId",
        hasCreatedAt: true,
        hasUpdatedAt: true,
    },
    {
        name: tables.planner,
        id: "plannerId",
        hasCreatedAt: false,
        hasUpdatedAt: false,
    },
    {
        name: tables.plannerMeal,
        id: "mealId", // previously "id"
        hasCreatedAt: false,
        hasUpdatedAt: false,
    },
];

const memberTables = [
    { name: tables.listMember, id: "listId", entityTable: tables.list },
    { name: tables.bookMember, id: "bookId", entityTable: tables.book },
    { name: tables.plannerMember, id: "plannerId", entityTable: tables.planner },
];

const onUpdateTrigger = (table: string) => `
    CREATE TRIGGER "${table}_updatedAt"
    BEFORE UPDATE ON "${table}"
    FOR EACH ROW
    EXECUTE PROCEDURE on_update_timestamp();
`;

export const up = async (knex: Knex): Promise<void> => {
    await knex.schema.createTable(newTables.content, table => {
        table.uuid("contentId").primary().defaultTo(knex.raw("gen_random_uuid()"));
        table.uuid("createdBy").references("userId").inTable(tables.user).onDelete("SET NULL").onUpdate("CASCADE");
        table.timestamp("createdAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp("updatedAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });

    await knex.raw(onUpdateTrigger(newTables.content));

    await knex.schema.createTable(newTables.attachment, table => {
        table.uuid("attachmentId").primary().defaultTo(knex.raw("gen_random_uuid()"));
        table.text("uri").notNullable();
        table.uuid("createdBy").references("userId").inTable(tables.user).onDelete("SET NULL").onUpdate("CASCADE");
        table.timestamp("createdAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp("updatedAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });

    await knex.raw(onUpdateTrigger(newTables.attachment));

    await knex.schema.createTable(newTables.contentAttachment, table => {
        table
            .uuid("contentId")
            .references("contentId")
            .inTable(newTables.content)
            .onDelete("CASCADE")
            .onUpdate("CASCADE");
        table
            .uuid("attachmentId")
            .references("attachmentId")
            .inTable(newTables.attachment)
            .onDelete("CASCADE")
            .onUpdate("CASCADE");
        table.text("displayType");
        table.uuid("displayId").nullable();
        table.integer("displayOrder").nullable();
        table.primary(["attachmentId", "contentId"]);
    });

    // content_tag: replaces recipe_tag
    await knex.schema.createTable(newTables.contentTag, table => {
        table
            .uuid("contentId")
            .references("contentId")
            .inTable(newTables.content)
            .onDelete("CASCADE")
            .onUpdate("CASCADE");
        table.uuid("tagId").references("tagId").inTable(tables.tag).onDelete("CASCADE").onUpdate("CASCADE");
        table.primary(["contentId", "tagId"]);
    });

    // content_note: replaces recipe_note
    await knex.schema.createTable(newTables.contentNote, table => {
        table
            .uuid("noteId")
            .primary()
            .references("contentId")
            .inTable(newTables.content)
            .onDelete("CASCADE")
            .onUpdate("CASCADE");
        table
            .uuid("parentId")
            .references("contentId")
            .inTable(newTables.content)
            .onDelete("CASCADE")
            .onUpdate("CASCADE");
        table.string("title", 255);
        table.text("content");
        table.boolean("public").defaultTo(false);
    });

    // content_member: replaces various *_member tables
    await knex.schema.createTable("content_member", table => {
        table
            .uuid("contentId")
            .notNullable()
            .references("contentId")
            .inTable(newTables.content)
            .onDelete("CASCADE")
            .onUpdate("CASCADE");
        table.uuid("userId").references("userId").inTable(tables.user).onDelete("CASCADE").onUpdate("CASCADE");
        table.text("status").notNullable().defaultTo(UserStatus.Pending);
        table.primary(["contentId", "userId"]);
    });

    // Migrate listItem to single PK referencing content
    await knex.schema.alterTable(tables.listItem, table => {
        table.dropPrimary();
    });

    await knex.schema.alterTable(tables.listItem, table => {
        table.uuid("itemId").primary().alter();

        table.unique(["listId", "itemId"]);
    });

    // Migrate plannerMeal.id -> plannerMeal.mealId, link to content
    await knex.schema.alterTable(tables.plannerMeal, table => {
        table.dropPrimary();
        table.renameColumn("id", "mealId");
    });

    await knex.schema.alterTable(tables.plannerMeal, table => {
        table.uuid("mealId").primary().alter();
    });

    // Populate content from all content-deriving tables
    for (const { name, id } of migratingTables) {
        const columns = await knex(name).columnInfo();

        const hasCreatedBy = !!columns["createdBy"];
        const hasCreatedAt = !!columns["createdAt"];
        const hasUpdatedAt = !!columns["updatedAt"];

        const createdByCol = hasCreatedBy ? `"createdBy"` : "NULL";
        const createdAtCol = hasCreatedAt ? `"createdAt"` : "NOW()";
        const updatedAtCol = hasUpdatedAt ? `"updatedAt"` : "NOW()";

        await knex.raw(`
            INSERT INTO ${newTables.content} ("contentId", "createdBy", "createdAt", "updatedAt")
            SELECT "${id}", ${createdByCol}, ${createdAtCol}, ${updatedAtCol} FROM ${name};
        `);
    }

    // Add foreign keys to each content-deriving table
    for (const { name, id } of migratingTables) {
        await knex.raw(`
            ALTER TABLE "${name}"
            ADD CONSTRAINT "${name}_${id}_fk_content"
            FOREIGN KEY ("${id}")
            REFERENCES ${newTables.content}("contentId")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
        `);
    }

    // Migrate list, book and planner member data to content_member
    for (const { name, id } of memberTables) {
        const exists = await knex.schema.hasTable(name);
        if (!exists) continue;

        await knex.raw(`
        INSERT INTO content_member ("contentId", "userId", "status")
        SELECT t."${id}" AS "contentId", m."userId", m."status"
        FROM "${name}" m
        JOIN "${id === "listId" ? tables.list : id === "bookId" ? tables.book : tables.planner}" t
        ON m."${id}" = t."${id}";
    `);
        await knex.schema.dropTableIfExists(name);
    }

    // Migrate existing photo columns → attachment
    for (const { name, id, photoColumn } of migratingTables) {
        if (!photoColumn) continue;
        const columns = await knex(name).columnInfo();
        if (!columns[photoColumn]) continue;

        const createdAtCol = !!columns["createdAt"] ? `"createdAt"` : "NOW()";
        const updatedAtCol = !!columns["updatedAt"] ? `"updatedAt"` : "NOW()";

        await knex.raw(`
            INSERT INTO ${newTables.attachment} ("uri", "createdBy", "createdAt", "updatedAt")
            SELECT DISTINCT "${photoColumn}", "createdBy", ${createdAtCol}, ${updatedAtCol}
            FROM "${name}"
            WHERE "${photoColumn}" IS NOT NULL
        `);

        await knex.raw(`
            INSERT INTO ${newTables.contentAttachment} ("contentId", "attachmentId", "displayType")
            SELECT n."${id}" AS "contentId", a."attachmentId", 'hero' AS "displayType"
            FROM "${name}" n
            JOIN ${newTables.attachment} a ON n."${photoColumn}" = a."uri"
            WHERE n."${photoColumn}" IS NOT NULL;
        `);

        await knex.schema.alterTable(name, table => {
            table.dropColumn(photoColumn);
        });
    }

    // Recipe step photos are currently unused so safely dropped
    await knex.schema.alterTable(tables.recipeStep, table => {
        table.dropColumn("photo");
    });

    // Migrate recipe_note → content_note
    const hasRecipeNote = await knex.schema.hasTable(tables.recipeNote);
    if (hasRecipeNote) {
        // First insert into content (each note is a content entity)
        await knex.raw(`
            INSERT INTO ${newTables.content} ("contentId", "createdBy", "createdAt", "updatedAt")
            SELECT "noteId", "authorId", "createdAt", "updatedAt" FROM ${tables.recipeNote};
        `);

        // Then insert into content_note (inherits id)
        await knex.raw(`
            INSERT INTO ${newTables.contentNote} ("noteId", "parentId", "title", "content", "public")
            SELECT "noteId", "recipeId", "title", "content", "public"
            FROM ${tables.recipeNote};
        `);

        await knex.schema.dropTable(tables.recipeNote);
    }

    // Migrate recipe_tag → content_tag
    await knex.raw(`
            INSERT INTO ${newTables.contentTag} ("contentId", "tagId")
            SELECT "recipeId", "tagId" FROM ${tables.recipeTag};
        `);
    await knex.schema.dropTable(tables.recipeTag);

    // Drop redundant columns and triggers from content-deriving tables
    for (const { name } of migratingTables) {
        const columns = await knex(name).columnInfo();
        const dropCols = ["createdBy", "createdAt", "updatedAt"].filter(c => c in columns);
        if (dropCols.length > 0) {
            await knex.schema.alterTable(name, table => {
                for (const col of dropCols) table.dropColumn(col);
            });
        }

        await knex.raw(`DROP TRIGGER IF EXISTS "${name}_updatedAt" ON ${name};`);
    }
};

export const down = async (knex: Knex): Promise<void> => {
    // Restore recipe_note
    const hasContentNote = await knex.schema.hasTable(newTables.contentNote);
    if (hasContentNote) {
        await knex.schema.createTable(tables.recipeNote, table => {
            table.uuid("noteId").primary();
            table
                .uuid("recipeId")
                .references("recipeId")
                .inTable(tables.recipe)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table.uuid("authorId").references("userId").inTable(tables.user).onDelete("SET NULL").onUpdate("CASCADE");
            table.string("title", 255);
            table.text("content");
            table.boolean("public").defaultTo(false);
            table
                .uuid("parentId")
                .references("noteId")
                .inTable(tables.recipeNote)
                .onDelete("SET NULL")
                .onUpdate("CASCADE");
            table.timestamp("createdAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
            table.timestamp("updatedAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        });

        await knex.raw(`
            INSERT INTO ${tables.recipeNote} 
                ("noteId", "recipeId", "authorId", "title", "content", "public", "createdAt", "updatedAt")
            SELECT n."noteId", n."parentId", ce."createdBy", n."title", n."content", n."public", ce."createdAt", ce."updatedAt"
            FROM ${newTables.contentNote} n
            JOIN ${newTables.content} ce ON ce."contentId" = n."noteId";
        `);

        await knex.raw(onUpdateTrigger(tables.recipeNote));

        await knex.schema.dropTable(newTables.contentNote);
    }

    // Recreate recipe_tag
    const hasContentTag = await knex.schema.hasTable(newTables.contentTag);
    if (hasContentTag) {
        await knex.schema.createTable(tables.recipeTag, table => {
            table
                .uuid("recipeId")
                .references("recipeId")
                .inTable(tables.recipe)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            table.uuid("tagId").references("tagId").inTable(tables.tag).onDelete("CASCADE").onUpdate("CASCADE");
            table.primary(["recipeId", "tagId"]);
        });

        await knex.raw(`
            INSERT INTO ${tables.recipeTag} ("recipeId", "tagId")
            SELECT "contentId", "tagId"
            FROM ${newTables.contentTag};
        `);

        await knex.schema.dropTable(newTables.contentTag);
    }

    // Recreate the original member tables
    for (const { name, id, entityTable } of memberTables) {
        const exists = await knex.schema.hasTable(name);
        if (!exists) {
            await knex.schema.createTable(name, table => {
                table
                    .uuid(id)
                    .notNullable()
                    .references(id)
                    .inTable(entityTable)
                    .onDelete("CASCADE")
                    .onUpdate("CASCADE");
                table
                    .uuid("userId")
                    .notNullable()
                    .references("userId")
                    .inTable(tables.user)
                    .onDelete("CASCADE")
                    .onUpdate("CASCADE");
                table.text("status").notNullable().defaultTo(UserStatus.Pending);
                table.primary([id, "userId"]);
            });
        }

        await knex.raw(`
            INSERT INTO "${name}" ("${id}", "userId", "status")
            SELECT cm."contentId", cm."userId", cm."status"
            FROM content_member cm
            JOIN "${entityTable}" t ON cm."contentId" = t."${id}";
        `);
    }

    // Finally, drop the unified content_member table
    await knex.schema.dropTableIfExists(newTables.contentMember);

    // Restore dropped timestamp/creator columns. Technically an impure migration as not all had timestamps before
    for (const { name, id, hasCreatedAt, hasUpdatedAt } of migratingTables) {
        await knex.schema.alterTable(name, table => {
            table
                .uuid("createdBy")
                .nullable()
                .references("userId")
                .inTable(tables.user)
                .onDelete("CASCADE")
                .onUpdate("CASCADE");
            if (hasCreatedAt) table.timestamp("createdAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
            if (hasUpdatedAt) table.timestamp("updatedAt", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        });

        await knex.raw(`
            UPDATE "${name}" t
            SET
                ${hasCreatedAt ? `"createdAt" = ce."createdAt",` : ""}
                ${hasUpdatedAt ? `"updatedAt" = ce."updatedAt",` : ""}
                "createdBy" = ce."createdBy"
            FROM ${newTables.content} ce
            WHERE ce."contentId" = t."${id}";
        `);

        // Drop FK constraint to content
        await knex.raw(`ALTER TABLE "${name}" DROP CONSTRAINT IF EXISTS "${name}_${id}_fk_content";`);

        if (hasUpdatedAt) {
            await knex.raw(onUpdateTrigger(name));
        }
    }

    // Restore photo columns and data
    for (const { name, id, photoColumn } of migratingTables) {
        if (!photoColumn) continue;
        const hasAttachments = await knex.schema.hasTable(newTables.contentAttachment);
        if (hasAttachments) {
            await knex.schema.alterTable(name, t => {
                t.string(photoColumn, 255);
            });
            await knex.raw(`
                UPDATE "${name}" AS n
                SET "${photoColumn}" = a."uri"
                FROM ${newTables.contentAttachment} ca
                JOIN ${newTables.attachment} a ON a."attachmentId" = ca."attachmentId"
                WHERE ca."contentId" = n."${id}" AND ca."displayType" = 'hero';
            `);
        }
    }

    await knex.schema.alterTable(tables.recipeStep, t => {
        t.string("photo", 255);
    });

    // Revert plannerMeal.mealId -> id
    await knex.schema.alterTable(tables.plannerMeal, table => {
        table.dropPrimary();
        table.renameColumn("mealId", "id");
        table.primary(["id"]);
    });

    // Revert listItem PK
    await knex.schema.alterTable(tables.listItem, table => {
        table.dropPrimary();
        table.dropUnique(["listId", "itemId"]);
        table.primary(["listId", "itemId"]);
    });

    // Drop triggers
    await knex.raw(`DROP TRIGGER IF EXISTS "${newTables.content}_updatedAt" ON ${newTables.content};`);
    await knex.raw(`DROP TRIGGER IF EXISTS "${newTables.attachment}_updatedAt" ON ${newTables.attachment};`);

    // Drop attachment-related tables
    await knex.schema.dropTableIfExists(newTables.contentAttachment);
    await knex.schema.dropTableIfExists(newTables.attachment);
    await knex.schema.dropTableIfExists(newTables.content);
};
