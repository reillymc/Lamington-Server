import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { setupApp } from "../../src/app.ts";
import db, { type KnexDatabase } from "../../src/database/index.ts";
import { KnexTagRepository } from "../../src/repositories/knex/knexTagRepository.ts";
import type { components } from "../../src/routes/spec/index.ts";
import { PrepareAuthenticatedUser } from "../helpers/index.ts";

after(async () => {
    await db.destroy();
});

describe("Get all tags", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
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

        const parentTagId = uuid();
        const childTagId = uuid();

        await KnexTagRepository.create(database, [
            {
                tagId: parentTagId,
                name: "Parent Tag",
                description: "Parent Description",
            },
            {
                tagId: childTagId,
                name: "Child Tag",
                description: "Child Description",
                parentId: parentTagId,
            },
        ]);

        const res = await request(app).get("/v1/tags").set(token);

        expect(res.statusCode).toEqual(200);

        const tags = res.body as components["schemas"]["TagGroup"][];
        expect(tags.length).toEqual(1);

        const parentTag = tags.find((t) => t.tagId === parentTagId);
        expect(parentTag).toBeDefined();
        expect(parentTag?.name).toEqual("Parent Tag");
        expect(parentTag?.tags).toHaveLength(1);
        expect(parentTag?.tags?.[0]?.tagId).toEqual(childTagId);
    });
});
