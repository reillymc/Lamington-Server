import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { v4 } from "uuid";

import { setupApp } from "../src/app.ts";
import db from "../src/database/index.ts";
import type { KnexDatabase } from "../src/repositories/knex/knex.ts";
import { CreateUsers } from "./helpers/index.ts";

after(async () => {
    await db.destroy();
});

describe("Authentication Middleware", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        await database.rollback();
    });

    it("should return 401 if no token provided", async () => {
        const res = await request(app).get("/v1/profile");
        expect(res.statusCode).toEqual(401);
    });

    it("should return 401 if token verification fails", async () => {
        const res = await request(app)
            .get("/v1/profile")
            .set("Authorization", "Bearer invalid-token");
        expect(res.statusCode).toEqual(401);
    });

    it("should return 401 if user status is Pending (P)", async () => {
        const payload = { userId: v4(), status: "P" };
        const token = jwt.sign(payload, process.env.JWT_SECRET!, {
            noTimestamp: true,
            expiresIn: "1h",
        });

        const res = await request(app)
            .get("/v1/profile")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toEqual(401);
    });

    it("should return 401 if user status is Blocked (B)", async () => {
        const payload = { userId: v4(), status: "B" };
        const token = jwt.sign(payload, process.env.JWT_SECRET!, {
            noTimestamp: true,
            expiresIn: "1h",
        });

        const res = await request(app)
            .get("/v1/profile")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toEqual(401);
    });

    it("should authorise valid user", async () => {
        const [user] = await CreateUsers(database, { status: "M" });
        const payload = { userId: user!.userId, status: "M" };
        const token = jwt.sign(payload, process.env.JWT_SECRET!, {
            noTimestamp: true,
            expiresIn: "1h",
        });

        const res = await request(app)
            .get("/v1/profile")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.userId).toEqual(user!.userId);
    });
});
