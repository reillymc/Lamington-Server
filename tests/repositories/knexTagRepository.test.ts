import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import { v4 as uuid } from "uuid";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexTagRepository } from "../../src/repositories/knex/knexTagRepository.ts";
import { db } from "../helpers/setup.ts";

let database: KnexDatabase;

beforeEach(async () => {
    database = await db.transaction();
});

afterEach(async () => {
    await database.rollback();
});

after(async () => {
    await db.destroy();
});

describe("TagRepository", () => {
    describe("verifyExists", () => {
        it("should report existence per requested tag, preserving order and duplicates", async () => {
            const [existingTag] = await KnexTagRepository.create(database, [
                { name: uuid() },
            ]);

            const missingTagId = uuid();
            const requested = [
                existingTag!.tagId,
                missingTagId,
                existingTag!.tagId,
            ];

            const { tags } = await KnexTagRepository.verifyExists(database, {
                tags: requested.map((tagId) => ({ tagId })),
            });

            expect(tags).toEqual([
                { tagId: existingTag!.tagId, exists: true },
                { tagId: missingTagId, exists: false },
                { tagId: existingTag!.tagId, exists: true },
            ]);
        });

        it("should return no results for an empty request", async () => {
            const { tags } = await KnexTagRepository.verifyExists(database, {
                tags: [],
            });

            expect(tags).toEqual([]);
        });
    });
});
