import { after, afterEach, before, beforeEach, describe } from "node:test";
import { expect } from "expect";
import jwt from "jsonwebtoken";
import request from "supertest";
import { v4 } from "uuid";
import { CreateUsers } from "./helpers/index.ts";
import {
    accessSecret,
    beginTestTransaction,
    createTestApp,
    rollbackTestTransaction,
    TestContext,
    withCxIt,
} from "./helpers/setup.ts";

describe("Authentication Middleware", () => {
    let { app, userRepository } = TestContext;

    beforeEach(async () => {
        await beginTestTransaction();
        ({ app, userRepository } = createTestApp({}));
    });

    afterEach(async () => {
        await rollbackTestTransaction();
    });

    withCxIt("should return 401 if no token provided", async () => {
        const res = await request(app).get("/v1/profile");
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should return 401 if token verification fails", async () => {
        const res = await request(app)
            .get("/v1/profile")
            .set("Authorization", "Bearer invalid-token");
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should return 401 if user status is Pending (P)", async () => {
        const payload = { userId: v4(), status: "P" };
        const token = jwt.sign(payload, accessSecret, {
            noTimestamp: true,
            expiresIn: "1h",
        });

        const res = await request(app)
            .get("/v1/profile")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should return 401 if user status is Blocked (B)", async () => {
        const payload = { userId: v4(), status: "B" };
        const token = jwt.sign(payload, accessSecret, {
            noTimestamp: true,
            expiresIn: "1h",
        });

        const res = await request(app)
            .get("/v1/profile")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should return 401 if token format is invalid", async () => {
        const payload = { userName: v4(), status: "B" };
        const token = jwt.sign(payload, accessSecret, {
            noTimestamp: true,
            expiresIn: "1h",
        });

        const res = await request(app)
            .get("/v1/profile")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should authorise valid user", async () => {
        const [user] = await CreateUsers(userRepository, { status: "M" });
        const payload = { userId: user!.userId, status: "M" };
        const token = jwt.sign(payload, accessSecret, {
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

describe("Rate Limiter Middleware", () => {
    let { app } = TestContext;

    before(async () => {
        // App setup with default rate limiter
        await beginTestTransaction();
        ({ app } = createTestApp({}));

        // Exceed rate limit for general endpoints
        const responses = await Promise.all(
            Array.from({ length: 150 }).map(() => request(app).get("/v1")),
        );

        responses.map(({ statusCode }) => expect(statusCode).not.toEqual(429));
    });

    after(async () => {
        await rollbackTestTransaction();
    });

    withCxIt(
        "books should trigger 429 response after 150 requests",
        async () => {
            const res = await request(app).get("/v1/books");
            expect(res.statusCode).toEqual(429);
        },
    );

    withCxIt(
        "planners should trigger 429 response after 150 requests",
        async () => {
            const res = await request(app).get("/v1/planners");
            expect(res.statusCode).toEqual(429);
        },
    );

    withCxIt(
        "lists should trigger 429 response after 150 requests",
        async () => {
            const res = await request(app).delete(`/v1/lists/${v4()}`);

            expect(res.statusCode).toEqual(429);
        },
    );
});

describe("Health Check", () => {
    let { app } = TestContext;

    beforeEach(async () => {
        await beginTestTransaction();
        ({ app } = createTestApp({}));
    });

    afterEach(async () => {
        await rollbackTestTransaction();
    });

    withCxIt("should return 204", async () => {
        const res = await request(app).get("/health");
        expect(res.statusCode).toEqual(204);
    });
});
