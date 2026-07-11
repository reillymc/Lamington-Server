import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.transaction(async (trx) => {
        // Preserve existing relational model for rollback
        await trx.schema.renameTable("recipe_section", "recipe_section_legacy");
        await trx.schema.renameTable("recipe_step", "recipe_step_legacy");
        await trx.schema.renameTable(
            "recipe_ingredient",
            "recipe_ingredient_legacy",
        );

        await trx.raw(`
            ALTER TABLE recipe_ingredient_legacy
            RENAME CONSTRAINT recipe_ingredient_pkey
            TO recipe_ingredient_legacy_pkey;
        `);

        await trx.schema.alterTable("recipe", (table) => {
            table.jsonb("ingredients");
            table.jsonb("method");
        });

        await trx.raw(`
            ALTER TABLE "recipe"
            ALTER COLUMN "recipeId"
            SET DEFAULT gen_random_uuid();
        `);

        await trx.schema.alterTable("content_attachment", (table) => {
            table.dropColumn("displayOrder");
            table.dropColumn("displayId");
        });

        await trx.schema.alterTable("content_attachment", (table) => {
            table.jsonb("displayMetadata");
        });

        await trx.raw(`
            UPDATE "recipe" r
            SET "ingredients" =
            COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_strip_nulls(
                            jsonb_build_object(
                                'name',
                                CASE
                                    WHEN lower(nullif(btrim(rs."name"), '')) = 'default' THEN NULL
                                    ELSE nullif(btrim(rs."name"), '')
                                END,
                                'description', rs."description",
                                'items',
                                COALESCE(
                                    (
                                        SELECT jsonb_agg(
                                            jsonb_strip_nulls(
                                                jsonb_build_object(
                                                    'ingredient',
                                                    CASE
                                                        WHEN ri."ingredientId" IS NOT NULL THEN
                                                            jsonb_build_object(
                                                                'ingredientId', ri."ingredientId"
                                                            )
                                                    END,
                                                    'recipe',
                                                    CASE
                                                        WHEN ri."subrecipeId" IS NOT NULL THEN
                                                            jsonb_build_object(
                                                                'recipeId', ri."subrecipeId"
                                                            )
                                                    END,
                                                    'amount', ri."amount",
                                                    'unit', ri."unit",
                                                    'description', ri."description",
                                                    'multiplier', ri."multiplier"
                                                )
                                            )
                                            ORDER BY ri."index"
                                        )
                                        FROM "recipe_ingredient_legacy" ri
                                        WHERE ri."sectionId" = rs."sectionId"
                                        AND (
                                            ri."ingredientId" IS NOT NULL
                                            OR ri."subrecipeId" IS NOT NULL
                                        )
                                    ),
                                    '[]'::jsonb
                                )
                            )
                        )
                        ORDER BY rs."index"
                    )
                    FROM "recipe_section_legacy" rs
                    WHERE rs."recipeId" = r."recipeId"
                    AND EXISTS (
                        SELECT 1
                        FROM "recipe_ingredient_legacy" ri
                        WHERE ri."sectionId" = rs."sectionId"
                        AND (
                            ri."ingredientId" IS NOT NULL
                            OR ri."subrecipeId" IS NOT NULL
                        )
                    )
                ),
                '[]'::jsonb
            );
        `);

        await trx.raw(`
            UPDATE "recipe" r
            SET "method" =
            COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_strip_nulls(
                            jsonb_build_object(
                                'name',
                                CASE
                                    WHEN lower(nullif(btrim(rs."name"), '')) = 'default' THEN NULL
                                    ELSE nullif(btrim(rs."name"), '')
                                END,
                                'description', rs."description",
                                'items',
                                COALESCE(
                                    (
                                        SELECT jsonb_agg(
                                            jsonb_build_object(
                                                'content', st."description"
                                            )
                                            ORDER BY st."index"
                                        )
                                        FROM "recipe_step_legacy" st
                                        WHERE st."sectionId" = rs."sectionId"
                                    ),
                                    '[]'::jsonb
                                )
                            )
                        )
                        ORDER BY rs."index"
                    )
                    FROM "recipe_section_legacy" rs
                    WHERE rs."recipeId" = r."recipeId"
                    AND EXISTS (
                        SELECT 1
                        FROM "recipe_step_legacy" st
                        WHERE st."sectionId" = rs."sectionId"
                    )
                ),
                '[]'::jsonb
            );
        `);
        //
        // Create recipe -> recipe relationship table
        //
        await trx.schema.createTable("recipe_recipe", (table) => {
            table
                .uuid("recipeId")
                .notNullable()
                .references("recipeId")
                .inTable("recipe")
                .onDelete("CASCADE");

            table
                .uuid("subRecipeId")
                .notNullable()
                .references("recipeId")
                .inTable("recipe")
                .onDelete("RESTRICT");

            table.primary(["recipeId", "subRecipeId"]);
        });

        await trx.raw(`
            INSERT INTO "recipe_recipe"
                ("recipeId", "subRecipeId")
            SELECT DISTINCT
                "recipeId",
                "subrecipeId"
            FROM "recipe_ingredient_legacy"
            WHERE "subrecipeId" IS NOT NULL
            ON CONFLICT DO NOTHING;
        `);

        await trx.schema.createTable("recipe_ingredient", (table) => {
            table
                .uuid("recipeId")
                .notNullable()
                .references("recipeId")
                .inTable("recipe")
                .onDelete("RESTRICT");

            table
                .uuid("ingredientId")
                .notNullable()
                .references("ingredientId")
                .inTable("ingredient")
                .onDelete("RESTRICT");

            table.primary(["recipeId", "ingredientId"]);
            table.index(["ingredientId"]);
        });

        await trx.raw(`
            INSERT INTO "recipe_ingredient"
                ("recipeId", "ingredientId")
            SELECT DISTINCT
                "recipeId",
                "ingredientId"
            FROM "recipe_ingredient_legacy"
            WHERE "ingredientId" IS NOT NULL
            ON CONFLICT DO NOTHING;
        `);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.transaction(async (trx) => {
        await trx.schema.dropTableIfExists("recipe_recipe");
        await trx.schema.dropTableIfExists("recipe_ingredient");

        await trx.schema.alterTable("content_attachment", (table) => {
            table.uuid("displayId");
            table.integer("displayOrder");
        });

        await trx.schema.alterTable("content_attachment", (table) => {
            table.dropColumn("displayMetadata");
        });

        await trx.schema.alterTable("recipe", (table) => {
            table.dropColumn("ingredients");
            table.dropColumn("method");
        });

        await trx.schema.renameTable("recipe_section_legacy", "recipe_section");

        await trx.schema.renameTable("recipe_step_legacy", "recipe_step");

        await trx.schema.renameTable(
            "recipe_ingredient_legacy",
            "recipe_ingredient",
        );

        await trx.raw(`
            ALTER TABLE recipe_ingredient
            RENAME CONSTRAINT recipe_ingredient_legacy_pkey
            TO recipe_ingredient_pkey;
        `);
    });
}
