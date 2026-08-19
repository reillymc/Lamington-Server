import { after, afterEach, beforeEach, describe, it, mock } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import { v4 } from "uuid";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexIngredientRepository } from "../../src/repositories/knex/knexIngredientRepository.ts";
import type { components } from "../../src/routes/spec/index.ts";
import type { ContentExtractionService } from "../../src/services/contentExtractionService.ts";
import {
    CreateSystemIngredients,
    PrepareAuthenticatedUser,
    randomNumber,
} from "../helpers/index.ts";
import { createTestApp, db } from "../helpers/setup.ts";

let database: KnexDatabase;
let app: Express;

beforeEach(async () => {
    database = await db.transaction();
    app = createTestApp({ database });
});

afterEach(async () => {
    await database.rollback();
    mock.restoreAll();
});

after(async () => {
    await db.destroy();
});

describe("Extract recipe metadata", () => {
    it("should require authentication", async () => {
        const res = await request(app).get("/v1/extractor/recipeMetadata");
        expect(res.statusCode).toEqual(401);
    });

    it("should extract metadata from a URL", async () => {
        const extractRecipeMetadataMock = mock.fn(
            async (): ReturnType<
                ContentExtractionService["extractRecipeMetadata"]
            > => ({
                name: "Test Recipe",
                imageUrl: "http://example.com/image.jpg",
            }),
        );

        app = createTestApp({
            database,
            services: {
                contentExtractionService: {
                    extractRecipeMetadata: extractRecipeMetadataMock,
                    extractRecipe: mock.fn(),
                },
            },
        });

        const [token] = await PrepareAuthenticatedUser(database);
        const url = "https://example.com/recipe";

        const res = await request(app)
            .get("/v1/extractor/recipeMetadata")
            .query({ url })
            .set(token);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({
            name: "Test Recipe",
            imageUrl: "http://example.com/image.jpg",
        });
        expect(extractRecipeMetadataMock.mock.calls.length).toBe(1);
        expect(
            extractRecipeMetadataMock.mock.calls[0]!.arguments.at(0),
        ).toEqual(url);
    });

    it("should return 500 if extraction fails", async () => {
        const extractRecipeMetadataMock = mock.fn(
            async (): ReturnType<
                ContentExtractionService["extractRecipeMetadata"]
            > => {
                throw new Error("Extraction failed");
            },
        );

        app = createTestApp({
            database,
            services: {
                contentExtractionService: {
                    extractRecipeMetadata: extractRecipeMetadataMock,
                    extractRecipe: mock.fn(),
                },
            },
        });

        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .get("/v1/extractor/recipeMetadata")
            .query({ url: "http://fail.com" })
            .set(token);

        expect(res.statusCode).toEqual(500);
    });
});

describe("Extract full recipe", () => {
    it("should require authentication", async () => {
        const res = await request(app).get("/v1/extractor/recipe");
        expect(res.statusCode).toEqual(401);
    });

    it("should extract full recipe from a URL", async () => {
        const mockRecipe: Awaited<
            ReturnType<ContentExtractionService["extractRecipe"]>
        > = {
            name: v4(),
            cookTime: randomNumber(),
            prepTime: randomNumber(),
            source: v4(),
        };

        const extractRecipeMock = mock.fn(
            async (): ReturnType<ContentExtractionService["extractRecipe"]> =>
                mockRecipe,
        );

        app = createTestApp({
            database,
            services: {
                contentExtractionService: {
                    extractRecipeMetadata: mock.fn(),
                    extractRecipe: extractRecipeMock,
                },
            },
        });

        const [token, user] = await PrepareAuthenticatedUser(database);
        const url = "https://example.com/recipe";

        const res = await request(app)
            .get("/v1/extractor/recipe")
            .query({ url })
            .set(token);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual(mockRecipe);
        expect(extractRecipeMock.mock.calls.length).toBe(1);
        expect(extractRecipeMock.mock.calls[0]!.arguments.at(0)).toEqual(url);
        expect(extractRecipeMock.mock.calls[0]!.arguments.at(1)).toEqual(
            user.userId,
        );
    });

    it("should return 500 if extraction fails", async () => {
        const extractRecipeMock = mock.fn(
            async (): ReturnType<ContentExtractionService["extractRecipe"]> => {
                throw new Error("Extraction failed");
            },
        );

        app = createTestApp({
            database,
            services: {
                contentExtractionService: {
                    extractRecipeMetadata: mock.fn(),
                    extractRecipe: extractRecipeMock,
                },
            },
        });

        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .get("/v1/extractor/recipe")
            .query({ url: "http://fail.com" })
            .set(token);

        expect(res.statusCode).toEqual(500);
    });
});

describe("Extract full recipe with ingredient matching", () => {
    it("should include matched system and user ingredients and candidates", async () => {
        const systemIngredients = await CreateSystemIngredients(database, [
            { name: "garlic" },
            { name: "all-purpose flour" },
            { name: "corn flour" },
            { name: "soy sauce" },
        ]);

        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            ingredients: [userIngredient],
        } = await KnexIngredientRepository.create(database, {
            userId: user.userId,
            ingredients: [
                { name: "Aged cheddar", namePlural: "Aged cheddars" },
            ],
        });

        const html = `<!DOCTYPE html><html><head><script type="application/ld+json">${JSON.stringify(
            {
                "@context": "https://schema.org",
                "@type": "Recipe",
                name: "Test Recipe",
                recipeIngredient: [
                    "1 Garlic",
                    "2 cups Flour",
                    "2 tbsp Soy sauce",
                    "100 g Aged cheddar",
                ],
            },
        )}</script></head><body></body></html>`;

        mock.method(
            globalThis,
            "fetch",
            async () =>
                new Response(html, {
                    status: 200,
                    headers: { "content-type": "text/html" },
                }),
        );

        const url = "https://example.com/recipe";

        const res = await request(app)
            .get("/v1/extractor/recipe")
            .query({ url })
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { ingredients } =
            res.body as components["schemas"]["ExtractedRecipe"];
        const items = ingredients?.[0]?.items ?? [];

        const garlicItem = items.find((item) => item.name === "Garlic");
        const flourItem = items.find((item) => item.name === "Flour");
        const soySauceItem = items.find((item) => item.name === "Soy sauce");
        const cheddarItem = items.find((item) => item.name === "Aged cheddar");

        expect(garlicItem).toBeDefined();
        expect(garlicItem!.ingredient).toEqual({
            ingredientId: systemIngredients[0]!.ingredientId,
            name: "garlic",
        });
        expect(garlicItem!.ingredientCandidates?.[0]).toMatchObject({
            ingredientId: systemIngredients[0]!.ingredientId,
            name: "garlic",
            score: 1,
        });

        expect(flourItem).toBeDefined();
        expect(flourItem!.ingredient).toBeUndefined();
        expect(flourItem!.unit).toBe("cups");
        expect(
            flourItem!.ingredientCandidates?.map(({ name }) => name).sort(),
        ).toEqual(["all-purpose flour", "corn flour"]);
        for (const candidate of flourItem!.ingredientCandidates!) {
            expect(candidate.score).toBeLessThan(1);
        }

        expect(soySauceItem).toBeDefined();
        expect(soySauceItem!.ingredient).toEqual({
            ingredientId: systemIngredients[3]!.ingredientId,
            name: "soy sauce",
        });

        expect(cheddarItem).toBeDefined();
        expect(cheddarItem!.ingredient).toEqual({
            ingredientId: userIngredient!.ingredientId,
            name: "Aged cheddar",
            namePlural: "Aged cheddars",
        });
    });

    it("should not include matched ingredients when no ingredients exist", async () => {
        const html = `<!DOCTYPE html><html><head><script type="application/ld+json">${JSON.stringify(
            {
                "@context": "https://schema.org",
                "@type": "Recipe",
                name: "Test Recipe",
                recipeIngredient: ["1 Garlic"],
            },
        )}</script></head><body></body></html>`;

        mock.method(
            globalThis,
            "fetch",
            async () =>
                new Response(html, {
                    status: 200,
                    headers: { "content-type": "text/html" },
                }),
        );

        const [token] = await PrepareAuthenticatedUser(database);
        const url = "https://example.com/recipe";

        const res = await request(app)
            .get("/v1/extractor/recipe")
            .query({ url })
            .set(token);

        expect(res.statusCode).toEqual(200);

        const { ingredients } =
            res.body as components["schemas"]["ExtractedRecipe"];
        const items = ingredients?.[0]?.items ?? [];
        const garlicItem = items.find((item) => item.name === "Garlic");

        expect(garlicItem).toBeDefined();
        expect(garlicItem!.ingredient).toBeUndefined();
        expect(garlicItem!.ingredientCandidates).toBeUndefined();
    });
});
