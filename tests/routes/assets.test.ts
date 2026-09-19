import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { PrepareAuthenticatedUser } from "../helpers/index.ts";
import { createTestApp, db } from "../helpers/setup.ts";

let assetDirectory: string;

before(() => {
    assetDirectory = mkdtempSync(join(tmpdir(), "lamington-assets-"));
    writeFileSync(
        join(assetDirectory, "ingredients.json"),
        JSON.stringify([
            {
                ingredientId: "00000000-0000-0000-0000-000000000000",
                name: "ingredientA",
                namePlural: "ingredientsA",
            },
        ]),
    );
});

after(async () => {
    rmSync(assetDirectory, { recursive: true, force: true });
    await db.destroy();
});

describe("Get preset ingredients", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = createTestApp({ database, config: { assetDirectory } });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("should return ingredients list", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const res = await request(app)
            .get("/v1/assets/ingredients.json")
            .set(token);

        expect(res.statusCode).toEqual(200);

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });
});
