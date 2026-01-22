import { expect } from "expect";
import type { Express } from "express";
import { after, afterEach, beforeEach, describe, it } from "node:test";
import request from "supertest";

import { setupApp } from "../../src/app.ts";
import { type components } from "../../src/routes/spec/index.ts";
import { PrepareAuthenticatedUser } from "../helpers/index.ts";
import db, { type KnexDatabase } from "../../src/database/index.ts";
import { KnexUserRepository } from "../../src/repositories/knex/knexUserRepository.ts";

after(async () => {
    await db.destroy();
});

describe("Get current user profile", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).get("/v1/profile");
        expect(res.statusCode).toEqual(401);
    });

    it("should return current user profile", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

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
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).delete("/v1/profile");
        expect(res.statusCode).toEqual(401);
    });

    it("should delete current user profile", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const res = await request(app).delete("/v1/profile").set(token);

        expect(res.statusCode).toEqual(204);

        const { users } = await KnexUserRepository.read(database, { users: [{ userId: user.userId }] });
        expect(users.length).toEqual(0);
    });
});
