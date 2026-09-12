import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, afterEach, before, beforeEach, it } from "node:test";
import { expect } from "expect";
import { v4 } from "uuid";
import { createRefreshIngredientsAssetJob } from "../../src/jobs/refreshIngredientsAsset.ts";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexIngredientRepository } from "../../src/repositories/knex/knexIngredientRepository.ts";
import { SYSTEM_USER_ID } from "../../src/utils/systemUser.ts";
import { db, silentLogger } from "../helpers/setup.ts";

let database: KnexDatabase;
let assetDirectory: string;

before(() => {
    assetDirectory = mkdtempSync(join(tmpdir(), "lamington-assets-"));
});

after(() => {
    rmSync(assetDirectory, { recursive: true, force: true });
});

beforeEach(async () => {
    database = await db.transaction();
});

afterEach(async () => {
    await database.rollback();
});

after(async () => {
    await db.destroy();
});

const createJob = (database: KnexDatabase) =>
    createRefreshIngredientsAssetJob({
        database,
        repositories: { ingredientRepository: KnexIngredientRepository },
        assetDirectory,
        logger: silentLogger,
    });

it("should write all global ingredients to the asset file", async () => {
    const ingredientId = v4();
    await database("content").insert({
        contentId: ingredientId,
        createdBy: SYSTEM_USER_ID,
    });
    await database("ingredient").insert({
        ingredientId,
        name: "Apple",
        namePlural: "Apples",
        description: "A delicious fruit",
    });

    const result = await createJob(database).run();

    expect(result).toBe(true);

    const written = JSON.parse(
        readFileSync(join(assetDirectory, "ingredients.json"), "utf-8"),
    );

    expect(written).toEqual([
        {
            ingredientId,
            name: "Apple",
            namePlural: "Apples",
            description: "A delicious fruit",
        },
    ]);
});
