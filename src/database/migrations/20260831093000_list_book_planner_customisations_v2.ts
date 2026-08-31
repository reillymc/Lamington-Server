import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.transaction(async (trx) => {
        await trx.schema.alterTable("list", (table) => {
            table.string("color", 16);
            table.jsonb("icon");
        });

        await trx.schema.alterTable("book", (table) => {
            table.string("color", 16);
            table.jsonb("icon");
        });

        await trx.schema.alterTable("planner", (table) => {
            table.string("color", 16);
        });

        await trx.raw(`
            UPDATE "list"
            SET
                "color" = "customisations"->>'color',
                "icon" = CASE
                    WHEN "customisations"->>'icon' IS NULL THEN NULL
                    WHEN "customisations"->>'icon' LIKE 'variant%'
                        THEN jsonb_build_object('type', 'icon', 'value', "customisations"->>'icon')
                    ELSE jsonb_build_object('type', 'custom', 'value', "customisations"->>'icon')
                END
            WHERE "customisations" IS NOT NULL;
        `);

        await trx.raw(`
            UPDATE "book"
            SET
                "color" = "customisations"->>'color',
                "icon" = CASE
                    WHEN "customisations"->>'icon' IS NULL THEN NULL
                    WHEN "customisations"->>'icon' LIKE 'variant%'
                        THEN jsonb_build_object('type', 'icon', 'value', "customisations"->>'icon')
                    ELSE jsonb_build_object('type', 'custom', 'value', "customisations"->>'icon')
                END
            WHERE "customisations" IS NOT NULL;
        `);

        await trx.raw(`
            UPDATE "planner"
            SET "color" = "customisations"->>'color'
            WHERE "customisations" IS NOT NULL;
        `);

        await trx.schema.alterTable("list", (table) => {
            table.dropColumn("customisations");
        });

        await trx.schema.alterTable("book", (table) => {
            table.dropColumn("customisations");
        });

        await trx.schema.alterTable("planner", (table) => {
            table.dropColumn("customisations");
        });
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.transaction(async (trx) => {
        await trx.schema.alterTable("list", (table) => {
            table.jsonb("customisations");
        });

        await trx.schema.alterTable("book", (table) => {
            table.jsonb("customisations");
        });

        await trx.schema.alterTable("planner", (table) => {
            table.jsonb("customisations");
        });

        await trx.raw(`
            UPDATE "list"
            SET "customisations" = CASE
                WHEN "color" IS NULL AND "icon" IS NULL THEN NULL
                ELSE jsonb_strip_nulls(
                    jsonb_build_object(
                        'color', "color",
                        'icon', "icon"->>'value'
                    )
                )
            END;
        `);

        await trx.raw(`
            UPDATE "book"
            SET "customisations" = CASE
                WHEN "color" IS NULL AND "icon" IS NULL THEN NULL
                ELSE jsonb_strip_nulls(
                    jsonb_build_object(
                        'color', "color",
                        'icon', "icon"->>'value'
                    )
                )
            END;
        `);

        await trx.raw(`
            UPDATE "planner"
            SET "customisations" = CASE
                WHEN "color" IS NULL THEN NULL
                ELSE jsonb_strip_nulls(jsonb_build_object('color', "color"))
            END;
        `);

        await trx.schema.alterTable("list", (table) => {
            table.dropColumn("color");
            table.dropColumn("icon");
        });

        await trx.schema.alterTable("book", (table) => {
            table.dropColumn("color");
            table.dropColumn("icon");
        });

        await trx.schema.alterTable("planner", (table) => {
            table.dropColumn("color");
        });
    });
}
