import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import { v4 as uuid } from "uuid";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexIngredientRepository } from "../../src/repositories/knex/knexIngredientRepository.ts";
import { CreateUsers, PrepareAuthenticatedUser } from "../helpers/index.ts";
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

const createSystemIngredient = async (
    database: KnexDatabase,
    name = "System ingredient",
) => {
    const ingredientId = uuid();
    await database("content").insert({ contentId: ingredientId });
    await database("ingredient").insert({ ingredientId, name });
};

describe("IngredientRepository.readAll", () => {
    it("should return only system ingredients when owner is null", async () => {
        const [user] = await CreateUsers(database);
        await KnexIngredientRepository.create(database, {
            userId: user!.userId,
            ingredients: [{ name: "User ingredient" }],
        });
        await createSystemIngredient(database, "System ingredient");

        const { ingredients } = await KnexIngredientRepository.readAll(
            database,
            { filter: { owner: null } },
        );

        const names = ingredients.map(({ name }) => name);

        expect(names).toContain("System ingredient");
        expect(names).not.toContain("User ingredient");
    });

    it("should return only the owner's ingredients when owner is a user", async () => {
        const [, user] = await PrepareAuthenticatedUser(database);
        const [otherUser] = (await CreateUsers(database)) as [typeof user];
        await createSystemIngredient(database);

        await KnexIngredientRepository.create(database, {
            userId: user!.userId,
            ingredients: [{ name: "My ingredient" }],
        });
        await KnexIngredientRepository.create(database, {
            userId: otherUser.userId,
            ingredients: [{ name: "Other user ingredient" }],
        });

        const { ingredients } = await KnexIngredientRepository.readAll(
            database,
            { userId: user!.userId, filter: { owner: user!.userId } },
        );

        const names = ingredients.map(({ name }) => name);

        expect(names).toContain("My ingredient");
        expect(names).not.toContain("System ingredient");
        expect(names).not.toContain("Other user ingredient");
    });

    it("should return system and the user's ingredients by default", async () => {
        const [, user] = await PrepareAuthenticatedUser(database);
        const [otherUser] = (await CreateUsers(database)) as [typeof user];
        await createSystemIngredient(database);

        await KnexIngredientRepository.create(database, {
            userId: user!.userId,
            ingredients: [{ name: "My ingredient" }],
        });
        await KnexIngredientRepository.create(database, {
            userId: otherUser.userId,
            ingredients: [{ name: "Other user ingredient" }],
        });

        const { ingredients } = await KnexIngredientRepository.readAll(
            database,
            { userId: user!.userId },
        );

        const names = ingredients.map(({ name }) => name);

        expect(names).toContain("System ingredient");
        expect(names).toContain("My ingredient");
        expect(names).not.toContain("Other user ingredient");
    });
});
