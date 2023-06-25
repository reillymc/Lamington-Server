import request from "supertest";

import app from "../../../src/app";
import { CleanTables, RecipeEndpoint } from "../../helpers";

beforeEach(async () => {
    await CleanTables("book", "user", "book_member");
});

afterAll(async () => {
    await CleanTables("book", "user", "book_member");
});

test("route should require authentication", async () => {
    const res = await request(app).post(RecipeEndpoint.postRecipe);

    expect(res.statusCode).toEqual(401);
});

/**
 * TODO: Add tests for:
 * saving ingredients
 * removing ingredients
 * saving steps
 * removing steps
 * saving tags
 * removing tags
 */
