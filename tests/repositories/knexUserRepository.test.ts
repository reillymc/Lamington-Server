import { describe, it } from "node:test";
import { expect } from "expect";
import { createKnexTxStore } from "../../src/repositories/knex/knexRepository.ts";
import { createKnexUserRepository } from "../../src/repositories/knex/knexUserRepository.ts";

describe("Knex user repository", () => {
    it("throws when called outside a transaction context", () => {
        const repo = createKnexUserRepository(createKnexTxStore());

        expect(() => repo.read({ users: [{ userId: "1" }] })).toThrow(
            "Knex repository called outside a transaction context",
        );
    });
});
