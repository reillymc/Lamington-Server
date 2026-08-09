import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexTagRepository } from "../../src/repositories/knex/knexTagRepository.ts";
import type { components } from "../../src/routes/spec/index.ts";
import { PrepareAuthenticatedUser } from "../helpers/index.ts";
import { createTestApp, db } from "../helpers/setup.ts";

after(async () => {
    await db.destroy();
});

describe("Get all tags", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = createTestApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("should require authentication", async () => {
        const res = await request(app).get("/v1/tags");
        expect(res.statusCode).toEqual(401);
    });

    it("should return tags", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const [parentTag] = await KnexTagRepository.create(database, [
            {
                name: "Parent Tag",
                description: "Parent Description",
            },
        ]);
        const [childTag] = await KnexTagRepository.create(database, [
            {
                name: "Child Tag",
                description: "Child Description",
                parentId: parentTag!.tagId,
            },
        ]);

        const res = await request(app).get("/v1/tags").set(token);

        expect(res.statusCode).toEqual(200);

        const tags = res.body as components["schemas"]["TagGroup"][];
        expect(tags.length).toEqual(1);

        const parentTagResponse = tags.find(
            (t) => t.tagId === parentTag!.tagId,
        );
        expect(parentTagResponse).toBeDefined();
        expect(parentTagResponse?.name).toEqual("Parent Tag");
        expect(parentTagResponse?.tags).toHaveLength(1);
        expect(parentTagResponse?.tags?.[0]?.tagId).toEqual(childTag!.tagId);
    });
});
