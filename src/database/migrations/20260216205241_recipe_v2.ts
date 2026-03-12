import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        ALTER TABLE "recipe_section" RENAME COLUMN "index" TO "order";
        ALTER TABLE "recipe_ingredient" RENAME COLUMN "index" TO "order";
        ALTER TABLE "recipe_step" RENAME COLUMN "index" TO "order";
        ALTER TABLE "recipe" ALTER COLUMN "recipeId" SET DEFAULT gen_random_uuid();
        ALTER TABLE "recipe_section" ALTER COLUMN "sectionId" SET DEFAULT gen_random_uuid();
        ALTER TABLE "recipe_ingredient" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
        ALTER TABLE "recipe_step" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        ALTER TABLE "recipe_step" ALTER COLUMN "id" DROP DEFAULT;
        ALTER TABLE "recipe_ingredient" ALTER COLUMN "id" DROP DEFAULT;
        ALTER TABLE "recipe_section" ALTER COLUMN "sectionId" DROP DEFAULT;
        ALTER TABLE "recipe" ALTER COLUMN "recipeId" DROP DEFAULT;
        ALTER TABLE "recipe_step" RENAME COLUMN "order" TO "index";
        ALTER TABLE "recipe_ingredient" RENAME COLUMN "order" TO "index";
        ALTER TABLE "recipe_section" RENAME COLUMN "order" TO "index";
    `);
}
