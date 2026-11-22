import { createServer, type Server } from "node:http";
import { after, afterEach, beforeEach, describe, it, mock } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import type { IngredientRepository } from "../../src/repositories/ingredientRepository.ts";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import type { TagRepository } from "../../src/repositories/tagRepository.ts";
import { createHttpRecipeExtractor } from "../../src/services/extractor/extractorClient.ts";
import {
    PrepareAuthenticatedUser,
    runTestCases,
    type TestCase,
} from "../helpers/index.ts";
import { createTestApp, db } from "../helpers/setup.ts";

let database: KnexDatabase;
let app: Express;
let server: Server | undefined;
let receivedAuthorization: string | undefined;

const tagRepository: TagRepository = {
    readAll: async () => [
        {
            tagId: "11111111-1111-4111-8111-111111111111",
            name: "Cuisine",
            description: undefined,
            parentId: undefined,
        },
        {
            tagId: "22222222-2222-4222-8222-222222222222",
            name: "Italian",
            description: undefined,
            parentId: "11111111-1111-4111-8111-111111111111",
        },
    ],
    create: async () => [],
    verifyExists: async () => ({ tags: [] }),
};

const ingredientRepository: IngredientRepository = {
    readAll: async () => ({
        ingredients: [
            {
                ingredientId: "33333333-3333-4333-8333-333333333333",
                name: "flour",
                namePlural: undefined,
                description: undefined,
                owner: undefined,
            },
        ],
    }),
    create: async () => ({ userId: "user-id", ingredients: [] }),
    verifyPermissions: async () => ({
        userId: "user-id",
        ingredients: [],
    }),
};

const createApp = (baseUrl: string | undefined, apiKey?: string) => {
    const extractor = createHttpRecipeExtractor({ baseUrl, apiKey });
    return createTestApp({
        database,
        repositories: { ingredientRepository, tagRepository },
        extractor,
    });
};

const startServer = (
    handler: Parameters<typeof createServer>[1],
): Promise<string> =>
    new Promise((resolve) => {
        server = createServer(handler);
        server.listen(0, "127.0.0.1", () => {
            const address = server?.address();
            if (!address || typeof address === "string") {
                throw new Error("Unable to bind test server");
            }
            resolve(`http://127.0.0.1:${address.port}`);
        });
    });

const stopServer = async () => {
    if (!server) return;
    await new Promise<void>((resolve) => {
        server?.close(() => resolve());
    });
    server = undefined;
};

beforeEach(async () => {
    database = await db.transaction();
    receivedAuthorization = undefined;
});

afterEach(async () => {
    await stopServer();
    await database.rollback();
    mock.restoreAll();
});

after(async () => {
    await db.destroy();
});

const successfulRecipe = {
    name: "Test Recipe",
    ingredients: [
        {
            name: "Ingredients",
            items: [{ name: "flour" }],
        },
    ],
    method: [
        {
            name: "Method",
            items: [{ content: "Cook it." }],
        },
    ],
    tagCandidates: { cuisine: ["italian"] },
};

describe("Extract recipe metadata", () => {
    it("extracts metadata over HTTP", async () => {
        const url = await startServer((_request, response) => {
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ name: "Test Recipe" }));
        });

        app = createApp(url);
        const [token] = await PrepareAuthenticatedUser(database);

        const response = await request(app)
            .get("/v1/extractor/recipeMetadata")
            .query({ url: "https://example.com/recipe" })
            .set(token);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ name: "Test Recipe" });
    });
});

describe("Extract full recipe", () => {
    it("extracts and enriches a recipe over HTTP", async () => {
        const url = await startServer((request_, response) => {
            receivedAuthorization = request_.headers.authorization;
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify(successfulRecipe));
        });

        app = createApp(url, "secret");
        const [token] = await PrepareAuthenticatedUser(database);

        const response = await request(app)
            .get("/v1/extractor/recipe")
            .query({ url: "https://example.com/recipe" })
            .set(token);

        expect(response.statusCode).toBe(200);
        expect(receivedAuthorization).toBe("Bearer secret");
        expect(response.body).toMatchObject({
            name: "Test Recipe",
            tags: [{ tagId: "22222222-2222-4222-8222-222222222222" }],
        });
        expect(response.body.ingredients[0].items[0]).toMatchObject({
            ingredient: {
                ingredientId: "33333333-3333-4333-8333-333333333333",
                name: "flour",
            },
        });
    });

    describe("sidecar error mapping", () => {
        type SidecarErrorInput = {
            sidecarStatus: number;
            body: Record<string, unknown>;
        };

        type SidecarErrorExpected = {
            status: number;
            code: string;
        };

        const testCases: TestCase<SidecarErrorExpected, SidecarErrorInput>[] = [
            {
                name: "maps sidecar 400 to INVALID_REQUEST",
                input: { sidecarStatus: 400, body: { message: "invalid" } },
                expected: { status: 400, code: "INVALID_REQUEST" },
            },
            {
                name: "maps sidecar 413 to INVALID_RECIPE",
                input: { sidecarStatus: 413, body: { message: "limit" } },
                expected: { status: 422, code: "INVALID_RECIPE" },
            },
            {
                name: "maps sidecar 422 to INVALID_RECIPE",
                input: { sidecarStatus: 422, body: { message: "no recipe" } },
                expected: { status: 422, code: "INVALID_RECIPE" },
            },
            {
                name: "maps an invalid sidecar error body by status",
                input: { sidecarStatus: 422, body: {} },
                expected: { status: 422, code: "INVALID_RECIPE" },
            },
            {
                name: "maps sidecar 502 to EXTRACTION_FAILED",
                input: {
                    sidecarStatus: 502,
                    body: { message: "fetch failed" },
                },
                expected: { status: 502, code: "EXTRACTION_FAILED" },
            },
            {
                name: "maps sidecar 500 to EXTRACTION_FAILED",
                input: { sidecarStatus: 500, body: { message: "internal" } },
                expected: { status: 502, code: "EXTRACTION_FAILED" },
            },
            {
                name: "maps sidecar 401 to EXTRACTOR_UNAVAILABLE",
                input: {
                    sidecarStatus: 401,
                    body: { message: "unauthorized" },
                },
                expected: { status: 503, code: "EXTRACTOR_UNAVAILABLE" },
            },
            {
                name: "maps sidecar 429 to EXTRACTOR_UNAVAILABLE",
                input: {
                    sidecarStatus: 429,
                    body: { message: "too many requests" },
                },
                expected: { status: 503, code: "EXTRACTOR_UNAVAILABLE" },
            },
            {
                name: "maps sidecar 504 to EXTRACTOR_UNAVAILABLE",
                input: { sidecarStatus: 504, body: { message: "timeout" } },
                expected: { status: 503, code: "EXTRACTOR_UNAVAILABLE" },
            },
        ];

        runTestCases(testCases, async ({ input, expected }) => {
            const url = await startServer((_request, response) => {
                response.writeHead(input.sidecarStatus, {
                    "content-type": "application/json",
                });
                response.end(JSON.stringify({ error: true, ...input.body }));
            });

            app = createApp(url);
            const [token] = await PrepareAuthenticatedUser(database);

            const response = await request(app)
                .get("/v1/extractor/recipe")
                .query({ url: "https://example.com/recipe" })
                .set(token);

            expect(response.statusCode).toBe(expected.status);
            expect(response.body).toMatchObject({
                error: true,
                code: expected.code,
            });
        });
    });

    describe("malformed success responses", () => {
        type MalformedResponseInput = {
            contentType: string;
            body: string;
        };

        type MalformedResponseExpected = {
            status: number;
            code: string;
        };

        const testCases: TestCase<
            MalformedResponseExpected,
            MalformedResponseInput
        >[] = [
            {
                name: "rejects a contract-failing sidecar response",
                input: {
                    contentType: "application/json",
                    body: JSON.stringify({ name: "Test", extra: true }),
                },
                expected: { status: 502, code: "EXTRACTION_FAILED" },
            },
            {
                name: "rejects a non-JSON sidecar response",
                input: { contentType: "text/plain", body: "not json" },
                expected: { status: 502, code: "EXTRACTION_FAILED" },
            },
            {
                name: "rejects invalid JSON from the sidecar",
                input: { contentType: "application/json", body: "{" },
                expected: { status: 502, code: "EXTRACTION_FAILED" },
            },
        ];

        runTestCases(testCases, async ({ input, expected }) => {
            const url = await startServer((_request, response) => {
                response.writeHead(200, {
                    "content-type": input.contentType,
                });
                response.end(input.body);
            });

            app = createApp(url);
            const [token] = await PrepareAuthenticatedUser(database);

            const response = await request(app)
                .get("/v1/extractor/recipe")
                .query({ url: "https://example.com/recipe" })
                .set(token);

            expect(response.statusCode).toBe(expected.status);
            expect(response.body).toMatchObject({
                error: true,
                code: expected.code,
            });
        });
    });

    it("maps sidecar redirects to unavailable", async () => {
        const url = await startServer((_request, response) => {
            response.writeHead(302, {
                location: "http://127.0.0.1:1/redirected",
            });
            response.end();
        });

        app = createApp(url);
        const [token] = await PrepareAuthenticatedUser(database);

        const response = await request(app)
            .get("/v1/extractor/recipe")
            .query({ url: "https://example.com/recipe" })
            .set(token);

        expect(response.statusCode).toBe(503);
        expect(response.body).toMatchObject({
            error: true,
            code: "EXTRACTOR_UNAVAILABLE",
        });
    });

    it("maps an oversized sidecar response to extraction failure", async () => {
        mock.method(
            globalThis,
            "fetch",
            async () =>
                new Response("small", {
                    headers: {
                        "content-length": String(16 * 1024 * 1024 + 1),
                    },
                }),
        );

        app = createApp("http://extractor:3001");
        const [token] = await PrepareAuthenticatedUser(database);

        const response = await request(app)
            .get("/v1/extractor/recipe")
            .query({ url: "https://example.com/recipe" })
            .set(token);

        expect(response.statusCode).toBe(502);
        expect(response.body).toMatchObject({
            error: true,
            code: "EXTRACTION_FAILED",
        });
    });

    it("maps an unreachable extractor to unavailable", async () => {
        app = createApp("http://127.0.0.1:1");
        const [token] = await PrepareAuthenticatedUser(database);

        const response = await request(app)
            .get("/v1/extractor/recipe")
            .query({ url: "https://example.com/recipe" })
            .set(token);

        expect(response.statusCode).toBe(503);
        expect(response.body).toMatchObject({
            error: true,
            code: "EXTRACTOR_UNAVAILABLE",
        });
    });

    it("maps extractor timeouts", async () => {
        mock.method(globalThis, "fetch", async () => {
            throw new DOMException("The operation timed out", "TimeoutError");
        });

        app = createApp("http://extractor:3001");
        const [token] = await PrepareAuthenticatedUser(database);

        const response = await request(app)
            .get("/v1/extractor/recipe")
            .query({ url: "https://example.com/recipe" })
            .set(token);

        expect(response.statusCode).toBe(503);
        expect(response.body).toMatchObject({
            error: true,
            code: "EXTRACTOR_UNAVAILABLE",
            message: "Recipe extractor timed out",
        });
    });
});
