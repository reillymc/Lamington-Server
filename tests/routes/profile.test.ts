import { afterEach, beforeEach, describe } from "node:test";
import { expect } from "expect";
import request from "supertest";
import type { components } from "../../src/routes/spec/index.ts";
import { PrepareAuthenticatedUser } from "../helpers/index.ts";
import {
    beginTestTransaction,
    createTestApp,
    rollbackTestTransaction,
    TestContext,
    withCxIt,
} from "../helpers/setup.ts";

let { app, userRepository } = TestContext;

beforeEach(async () => {
    await beginTestTransaction();
    ({ app, userRepository } = createTestApp({}));
});

afterEach(async () => {
    await rollbackTestTransaction();
});

describe("Get current user profile", () => {
    withCxIt("route should require authentication", async () => {
        const res = await request(app).get("/v1/profile");
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should return current user profile", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const res = await request(app).get("/v1/profile").set(token);

        expect(res.statusCode).toEqual(200);

        const profile = res.body as components["schemas"]["User"];

        expect(profile.userId).toEqual(user.userId);
        expect(profile.email).toEqual(user.email);
        expect(profile.firstName).toEqual(user.firstName);
        expect(profile.lastName).toEqual(user.lastName);
        expect(profile.status).toEqual(user.status);
    });
});

describe("Delete current user profile", () => {
    withCxIt("route should require authentication", async () => {
        const res = await request(app).delete("/v1/profile");
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should delete current user profile", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const res = await request(app).delete("/v1/profile").set(token);

        expect(res.statusCode).toEqual(204);

        const { users } = await userRepository.read({
            users: [{ userId: user.userId }],
        });
        expect(users.length).toEqual(0);
    });
});
