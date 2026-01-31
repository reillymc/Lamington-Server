import { after, afterEach, beforeEach, describe, it, mock } from "node:test";
import { expect } from "expect";
import request from "supertest";
import { v4 } from "uuid";
import { setupApp } from "../../src/app.ts";
import db from "../../src/database/index.ts";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import type { ContentExtractionService } from "../../src/services/contentExtractionService.ts";
import { PrepareAuthenticatedUser, randomNumber } from "../helpers/index.ts";

after(async () => {
    await db.destroy();
});

describe("Extract recipe metadata", () => {
    let database: KnexDatabase;

    beforeEach(async () => {
        database = await db.transaction();
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("should require authentication", async () => {
        const app = setupApp({ database });
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

        const app = setupApp({
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

        const app = setupApp({
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
    let database: KnexDatabase;

    beforeEach(async () => {
        database = await db.transaction();
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("should require authentication", async () => {
        const app = setupApp({ database });
        const res = await request(app).get("/v1/extractor/recipe");
        expect(res.statusCode).toEqual(401);
    });

    it("should extract full recipe from a URL", async () => {
        const mockRecipe: Awaited<
            ReturnType<ContentExtractionService["extractRecipe"]>
        > = {
            name: v4(),
            description: v4(),
            cookTime: randomNumber(),
            imageUrl: v4(),
            notes: v4(),
            prepTime: randomNumber(),
            source: v4(),
            url: v4(),
        };

        const extractRecipeMock = mock.fn(
            async (): ReturnType<ContentExtractionService["extractRecipe"]> =>
                mockRecipe,
        );

        const app = setupApp({
            database,
            services: {
                contentExtractionService: {
                    extractRecipeMetadata: mock.fn(),
                    extractRecipe: extractRecipeMock,
                },
            },
        });

        const [token] = await PrepareAuthenticatedUser(database);
        const url = "https://example.com/recipe";

        const res = await request(app)
            .get("/v1/extractor/recipe")
            .query({ url })
            .set(token);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual(mockRecipe);
        expect(extractRecipeMock.mock.calls.length).toBe(1);
        expect(extractRecipeMock.mock.calls[0]!.arguments.at(0)).toEqual(url);
    });

    it("should return 500 if extraction fails", async () => {
        const extractRecipeMock = mock.fn(
            async (): ReturnType<ContentExtractionService["extractRecipe"]> => {
                throw new Error("Extraction failed");
            },
        );

        const app = setupApp({
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
