import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import { v4 as uuid } from "uuid";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { PrepareAuthenticatedUser } from "../helpers/index.ts";
import { readOpenApiOperations } from "../helpers/openapi.ts";
import { createTestApp, db } from "../helpers/setup.ts";

type Method = "get" | "post" | "put" | "patch" | "delete";

type LocatedFieldError = {
    path: string[];
    location: "body" | "query" | "params" | "headers";
    code: string;
};

const tooManyTags = Array.from({ length: 51 }, () => uuid())
    .map((id) => `tags=${id}`)
    .join("&");

type ValidationCase = {
    name: string;
    method: Method;
    path: string;
    authenticated?: boolean;
    body?: string | object;
    expected?: LocatedFieldError[];
};

/**
 * Cross-cutting contract tests for request validation: any schema failure is a
 * 400 whose body carries the structured `fieldErrors` envelope. Domain-specific
 * constraint tests stay in their route suites; these cases cover each error
 * source (body/params/query) and a representative spread of codes.
 */
const validationCases: ValidationCase[] = [
    {
        name: "a missing required body field",
        method: "post",
        path: "/v1/auth/register",
        body: {
            email: "user@email.com",
            firstName: "John",
            lastName: "Doe",
        },
        expected: [{ path: ["password"], location: "body", code: "required" }],
    },
    {
        name: "a malformed body field",
        method: "post",
        path: "/v1/auth/register",
        body: {
            email: "not-an-email",
            firstName: "John",
            lastName: "Doe",
            password: "secure_password",
        },
        expected: [{ path: ["email"], location: "body", code: "format" }],
    },
    {
        name: "a body field violating a constraint",
        method: "post",
        path: "/v1/auth/register",
        body: {
            email: "user@email.com",
            firstName: "John",
            lastName: "Doe",
            password: "short",
        },
        expected: [{ path: ["password"], location: "body", code: "minLength" }],
    },
    {
        name: "an unknown body property",
        method: "post",
        path: "/v1/auth/register",
        body: {
            email: "user@email.com",
            firstName: "John",
            lastName: "Doe",
            password: "secure_password",
            extra: "invalid",
        },
        expected: [{ path: ["extra"], location: "body", code: "unknownField" }],
    },
    {
        name: "several invalid body fields at once",
        method: "post",
        path: "/v1/auth/register",
        body: { firstName: "John", lastName: "Doe" },
        expected: [
            { path: ["email"], location: "body", code: "required" },
            { path: ["password"], location: "body", code: "required" },
        ],
    },
    {
        name: "an empty collection body",
        method: "post",
        path: "/v1/cooklist/meals",
        authenticated: true,
        body: [],
    },
    {
        name: "an invalid enum in a collection body",
        method: "post",
        path: "/v1/cooklist/meals",
        authenticated: true,
        body: [{ description: uuid(), course: "invalid_course" }],
        expected: [
            { path: ["0", "course"], location: "body", code: "invalidOption" },
        ],
    },
    {
        name: "an unknown property in a collection body",
        method: "post",
        path: "/v1/cooklist/meals",
        authenticated: true,
        body: [{ description: uuid(), course: "dinner", extra: "invalid" }],
        expected: [
            { path: ["0", "extra"], location: "body", code: "unknownField" },
        ],
    },
    {
        name: "a malformed path parameter",
        method: "get",
        path: "/v1/recipes/not-a-uuid",
        authenticated: true,
        expected: [{ path: ["recipeId"], location: "params", code: "format" }],
    },
    {
        name: "a missing required query parameter",
        method: "get",
        path: "/v1/extractor/recipe",
        authenticated: true,
        expected: [{ path: ["url"], location: "query", code: "required" }],
    },
    {
        name: "a malformed query parameter",
        method: "get",
        path: "/v1/extractor/recipe?url=not-a-uri",
        authenticated: true,
        expected: [{ path: ["url"], location: "query", code: "format" }],
    },
    {
        name: "too many recipe tag filters",
        method: "get",
        path: `/v1/recipes?${tooManyTags}`,
        authenticated: true,
        expected: [{ path: ["tags"], location: "query", code: "maxItems" }],
    },
];

describe("Route request validation", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = createTestApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    after(async () => {
        await db.destroy();
    });

    for (const testCase of validationCases) {
        it(`should reject ${testCase.name} with a structured payload`, async () => {
            const http = request(app)[testCase.method](testCase.path);

            if (testCase.authenticated) {
                const [token] = await PrepareAuthenticatedUser(database);
                http.set(token);
            }

            if (testCase.body !== undefined) {
                http.send(testCase.body);
            }

            const res = await http;

            expect(res.statusCode).toEqual(400);
            expect(res.body).toMatchObject({
                error: true,
                code: "VALIDATION_FAILED",
                message: "Some fields are not valid",
            });
            expect(Array.isArray(res.body.fieldErrors)).toEqual(true);

            if (testCase.expected) {
                expect(res.body.fieldErrors).toEqual(
                    expect.arrayContaining(
                        testCase.expected.map((error) =>
                            expect.objectContaining(error),
                        ),
                    ),
                );
            }
        });
    }

    it("should document a 400 response on every input-validating operation", () => {
        const missing = readOpenApiOperations()
            .filter(({ hasInputSchema }) => hasInputSchema)
            .filter(
                ({ badRequestRef }) =>
                    badRequestRef !== "#/components/responses/BadRequest",
            )
            .map(
                ({ method, specPath }) => `${method.toUpperCase()} ${specPath}`,
            );

        expect(missing).toEqual([]);
    });
});
