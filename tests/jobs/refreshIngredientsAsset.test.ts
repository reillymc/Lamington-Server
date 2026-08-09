import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, afterEach, before, beforeEach } from "node:test";
import { expect } from "expect";
import { v4 } from "uuid";
import { createRefreshIngredientsAssetJob } from "../../src/jobs/refreshIngredientsAsset.ts";
import {
    beginTestTransaction,
    createTransactionRunner,
    getCurrentDatabase,
    repositories,
    rollbackTestTransaction,
    silentLogger,
    withCxIt,
} from "../helpers/setup.ts";

let assetDirectory: string;

before(() => {
    assetDirectory = mkdtempSync(join(tmpdir(), "lamington-assets-"));
});

after(() => {
    rmSync(assetDirectory, { recursive: true, force: true });
});

beforeEach(async () => {
    await beginTestTransaction();
});

afterEach(async () => {
    await rollbackTestTransaction();
});

const createJob = () =>
    createRefreshIngredientsAssetJob({
        transaction: createTransactionRunner(),
        repositories: {
            ingredientRepository: repositories.ingredientRepository,
        },
        assetDirectory,
        logger: silentLogger,
    });

withCxIt("should write all global ingredients to the asset file", async () => {
    const ingredientId = v4();
    await getCurrentDatabase()("content").insert({ contentId: ingredientId });
    await getCurrentDatabase()("ingredient").insert({
        ingredientId,
        name: "Apple",
        namePlural: "Apples",
        description: "A delicious fruit",
    });

    const result = await createJob().run();

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
