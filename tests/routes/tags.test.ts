import { afterEach, beforeEach, describe } from "node:test";
import { expect } from "expect";
import request from "supertest";
import type { components } from "../../src/routes/spec/index.ts";
import { PrepareAuthenticatedUser } from "../helpers/index.ts";
import {
    beginTestTransaction,
    createTestApp,
    rollbackTestTransaction,
    TestContext,
    withCxIt,
} from "../helpers/setup.ts";

describe("Get all tags", () => {
    let { app, tagRepository, userRepository } = TestContext;

    beforeEach(async () => {
        await beginTestTransaction();
        ({ app, tagRepository, userRepository } = createTestApp({}));
    });

    afterEach(async () => {
        await rollbackTestTransaction();
    });

    withCxIt("should require authentication", async () => {
        const res = await request(app).get("/v1/tags");
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should return tags", async () => {
        const [token] = await PrepareAuthenticatedUser(userRepository);

        const [parentTag] = await tagRepository.create([
            {
                name: "Parent Tag",
                description: "Parent Description",
            },
        ]);
        const [childTag] = await tagRepository.create([
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
