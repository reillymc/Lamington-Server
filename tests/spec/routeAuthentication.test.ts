import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { readOpenApiOperations } from "../helpers/openapi.ts";
import { createTestApp, db } from "../helpers/setup.ts";

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

const operations = readOpenApiOperations();

const protectedOperations = operations.filter(({ isPublic }) => !isPublic);
const publicOperations = operations.filter(({ isPublic }) => isPublic);

const EXPECTED_PUBLIC_OPERATIONS = [
    "post /auth/login",
    "post /auth/refresh",
    "post /auth/register",
];

/**
 * This test ensures that for each OpenAPI operation defined in openapi.yaml,
 * there authentication is enforced by default unless excluded above
 */
describe("Route authentication", () => {
    it("should expose only the expected public operations", () => {
        const publicOperationKeys = publicOperations.map(
            ({ method, specPath }) => `${method} ${specPath}`,
        );

        expect(publicOperationKeys.sort()).toEqual(
            [...EXPECTED_PUBLIC_OPERATIONS].sort(),
        );
    });

    for (const { method, specPath, requestPath } of protectedOperations) {
        it(`${method.toUpperCase()} ${specPath} should require authentication`, async () => {
            const res = await request(app)[method](requestPath);

            expect(res.statusCode).toEqual(401);
        });
    }

    for (const { method, specPath, requestPath } of publicOperations) {
        it(`${method.toUpperCase()} ${specPath} should not require authentication`, async () => {
            const res = await request(app)[method](requestPath);

            expect(res.statusCode).not.toEqual(401);
        });
    }
});
