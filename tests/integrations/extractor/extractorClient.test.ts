import { createServer, type Server } from "node:http";
import { afterEach, describe, it, mock } from "node:test";
import { expect } from "expect";
import {
    ExtractorFailureError,
    ExtractorRecipeError,
    ExtractorRequestError,
    ExtractorUnavailableError,
} from "../../../src/integrations/extractor/errors.ts";
import { createHttpExtractorClient } from "../../../src/integrations/extractor/extractorClient.ts";
import {
    InvalidImageUrlError,
    PayloadTooLargeError,
    UnsupportedMediaTypeError,
} from "../../../src/utils/errors.ts";
import { MAX_REMOTE_IMAGE_BYTES } from "../../../src/utils/remoteImage.ts";
import { runTestCases, type TestCase } from "../../helpers/index.ts";

let server: Server | undefined;

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

afterEach(async () => {
    mock.restoreAll();

    if (!server) return;
    await new Promise<void>((resolve) => {
        server?.close(() => resolve());
    });
    server = undefined;
});

const respondWithError = (status: number, message: string) => {
    const listener: Parameters<typeof createServer>[1] = (
        _request,
        response,
    ) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: true, message }));
    };
    return listener;
};

describe("extractor client image fetch", () => {
    it("returns image bytes and content type", async () => {
        const url = await startServer((_request, response) => {
            response.writeHead(200, { "content-type": "image/png" });
            response.end(Buffer.from([1, 2, 3]));
        });
        const client = createHttpExtractorClient({ baseUrl: url });

        await expect(
            client.fetchImage("https://example.com/image.png"),
        ).resolves.toEqual({
            body: Buffer.from([1, 2, 3]),
            contentType: "image/png",
        });
    });

    it("maps invalid image URLs", async () => {
        const url = await startServer(respondWithError(400, "bad url"));
        const client = createHttpExtractorClient({ baseUrl: url });

        await expect(
            client.fetchImage("https://example.com/image.png"),
        ).rejects.toThrow(InvalidImageUrlError);
    });

    it("maps oversized images", async () => {
        const url = await startServer(respondWithError(413, "too large"));
        const client = createHttpExtractorClient({ baseUrl: url });

        await expect(
            client.fetchImage("https://example.com/image.png"),
        ).rejects.toThrow(PayloadTooLargeError);
    });

    it("maps unsupported image media types", async () => {
        const url = await startServer(
            respondWithError(415, "unsupported media type"),
        );
        const client = createHttpExtractorClient({ baseUrl: url });

        await expect(
            client.fetchImage("https://example.com/image.svg"),
        ).rejects.toThrow(UnsupportedMediaTypeError);
    });

    it("maps upstream image fetch failures", async () => {
        const url = await startServer(respondWithError(502, "fetch failed"));
        const client = createHttpExtractorClient({ baseUrl: url });

        await expect(
            client.fetchImage("https://example.com/image.png"),
        ).rejects.toThrow(InvalidImageUrlError);
    });

    it("maps extractor unavailability", async () => {
        const url = await startServer(respondWithError(503, "unavailable"));
        const client = createHttpExtractorClient({ baseUrl: url });

        await expect(
            client.fetchImage("https://example.com/image.png"),
        ).rejects.toThrow(ExtractorUnavailableError);
    });

    it("rejects oversized image responses before reading", async () => {
        const url = await startServer((_request, response) => {
            response.writeHead(200, {
                "content-type": "image/png",
                "content-length": String(MAX_REMOTE_IMAGE_BYTES + 1),
            });
            response.end();
        });
        const client = createHttpExtractorClient({ baseUrl: url });

        await expect(
            client.fetchImage("https://example.com/image.png"),
        ).rejects.toThrow(PayloadTooLargeError);
    });
});

const successfulRecipe = {
    name: "Test Recipe",
    ingredients: [
        {
            name: "Ingredients",
            items: [
                {
                    raw: "2 cups plain flour, sifted",
                    name: "flour",
                    variants: ["plain flour", "all-purpose flour"],
                    preparation: "sifted",
                },
            ],
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

type ErrorClass = new (message?: string, innerError?: unknown) => Error;

describe("extractor client recipe extraction", () => {
    it("returns recipe metadata", async () => {
        const url = await startServer((_request, response) => {
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ name: "Test Recipe" }));
        });
        const client = createHttpExtractorClient({ baseUrl: url });

        await expect(
            client.extractRecipeMetadata("https://example.com/recipe"),
        ).resolves.toEqual({ name: "Test Recipe" });
    });

    it("returns a full recipe", async () => {
        const url = await startServer((_request, response) => {
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify(successfulRecipe));
        });
        const client = createHttpExtractorClient({ baseUrl: url });

        await expect(
            client.extractRecipe("https://example.com/recipe"),
        ).resolves.toEqual(successfulRecipe);
    });

    it("sends the API key", async () => {
        let authorization: string | undefined;
        const url = await startServer((request, response) => {
            authorization = request.headers.authorization;
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ name: "Test Recipe" }));
        });
        const client = createHttpExtractorClient({
            baseUrl: url,
            apiKey: "secret",
        });

        await client.extractRecipeMetadata("https://example.com/recipe");

        expect(authorization).toBe("Bearer secret");
    });

    describe("sidecar error mapping", () => {
        type ErrorInput = {
            sidecarStatus: number;
        };

        type ErrorExpected = {
            error: ErrorClass;
        };

        const testCases: TestCase<ErrorExpected, ErrorInput>[] = [
            {
                name: "maps 400 to a request error",
                input: { sidecarStatus: 400 },
                expected: { error: ExtractorRequestError },
            },
            {
                name: "maps 413 to a recipe error",
                input: { sidecarStatus: 413 },
                expected: { error: ExtractorRecipeError },
            },
            {
                name: "maps 415 to an unsupported media type error",
                input: { sidecarStatus: 415 },
                expected: { error: UnsupportedMediaTypeError },
            },
            {
                name: "maps 422 to a recipe error",
                input: { sidecarStatus: 422 },
                expected: { error: ExtractorRecipeError },
            },
            {
                name: "maps 500 to a failure error",
                input: { sidecarStatus: 500 },
                expected: { error: ExtractorFailureError },
            },
            {
                name: "maps 502 to a failure error",
                input: { sidecarStatus: 502 },
                expected: { error: ExtractorFailureError },
            },
            {
                name: "maps 401 to unavailable",
                input: { sidecarStatus: 401 },
                expected: { error: ExtractorUnavailableError },
            },
            {
                name: "maps 429 to unavailable",
                input: { sidecarStatus: 429 },
                expected: { error: ExtractorUnavailableError },
            },
            {
                name: "maps 503 to unavailable",
                input: { sidecarStatus: 503 },
                expected: { error: ExtractorUnavailableError },
            },
            {
                name: "maps 504 to unavailable",
                input: { sidecarStatus: 504 },
                expected: { error: ExtractorUnavailableError },
            },
        ];

        runTestCases(testCases, async ({ input, expected }) => {
            const url = await startServer(
                respondWithError(input.sidecarStatus, "sidecar error"),
            );
            const client = createHttpExtractorClient({ baseUrl: url });

            await expect(
                client.extractRecipe("https://example.com/recipe"),
            ).rejects.toThrow(expected.error);
        });
    });

    describe("malformed success responses", () => {
        type ResponseInput = {
            contentType: string;
            body: string;
        };

        type ResponseExpected = {
            error: ErrorClass;
        };

        const testCases: TestCase<ResponseExpected, ResponseInput>[] = [
            {
                name: "rejects a contract-failing response",
                input: {
                    contentType: "application/json",
                    body: JSON.stringify({ name: "Test", extra: true }),
                },
                expected: { error: ExtractorFailureError },
            },
            {
                name: "rejects a non-JSON response",
                input: { contentType: "text/plain", body: "not json" },
                expected: { error: ExtractorFailureError },
            },
            {
                name: "rejects invalid JSON",
                input: { contentType: "application/json", body: "{" },
                expected: { error: ExtractorFailureError },
            },
        ];

        runTestCases(testCases, async ({ input, expected }) => {
            const url = await startServer((_request, response) => {
                response.writeHead(200, {
                    "content-type": input.contentType,
                });
                response.end(input.body);
            });
            const client = createHttpExtractorClient({ baseUrl: url });

            await expect(
                client.extractRecipe("https://example.com/recipe"),
            ).rejects.toThrow(expected.error);
        });
    });

    it("maps redirects to unavailable", async () => {
        const url = await startServer((_request, response) => {
            response.writeHead(302, {
                location: "http://127.0.0.1:1/redirected",
            });
            response.end();
        });
        const client = createHttpExtractorClient({ baseUrl: url });

        await expect(
            client.extractRecipe("https://example.com/recipe"),
        ).rejects.toThrow(ExtractorUnavailableError);
    });

    it("rejects oversized responses", async () => {
        const url = await startServer((_request, response) => {
            response.writeHead(200, {
                "content-type": "application/json",
                "content-length": String(16 * 1024 * 1024 + 1),
            });
            response.end();
        });
        const client = createHttpExtractorClient({ baseUrl: url });

        await expect(
            client.extractRecipe("https://example.com/recipe"),
        ).rejects.toThrow(ExtractorFailureError);
    });

    it("maps timeouts to unavailable", async () => {
        mock.method(globalThis, "fetch", async () => {
            throw new DOMException("The operation timed out", "TimeoutError");
        });
        const client = createHttpExtractorClient({
            baseUrl: "http://extractor:3001",
        });

        await expect(
            client.extractRecipe("https://example.com/recipe"),
        ).rejects.toThrow(ExtractorUnavailableError);
    });

    it("maps an unreachable extractor to unavailable", async () => {
        const client = createHttpExtractorClient({
            baseUrl: "http://127.0.0.1:1",
        });

        await expect(
            client.extractRecipe("https://example.com/recipe"),
        ).rejects.toThrow(ExtractorUnavailableError);
    });
});
