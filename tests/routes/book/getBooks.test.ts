import request from "supertest";

import app from "../../../src/app";
import { BookEndpoint, CleanTables, CreateBooks, CreateUsers, PrepareAuthenticatedUser } from "../../helpers";
import { GetBooksResponse } from "../../../src/routes/spec";

beforeEach(async () => {
    await CleanTables("book", "user");
});

afterAll(async () => {
    await CleanTables("book", "user");
});

test("route should require authentication", async () => {
    const res = await request(app).get(BookEndpoint.getBooks);

    expect(res.statusCode).toEqual(401);
});

test("route should return only books for current user", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [otherUser] = await CreateUsers({ count: 1 });

    const [_, count] = await CreateBooks({ createdBy: user.userId });
    await CreateBooks({ createdBy: otherUser!.userId });

    const res = await request(app).get(BookEndpoint.getBooks).set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetBooksResponse;

    expect(Object.keys(data ?? {}).length).toEqual(count);
});
