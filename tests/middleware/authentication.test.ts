import assert from "node:assert";
import { beforeEach, describe, it, type Mock, mock } from "node:test";
import type { Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { v4 } from "uuid";
import {
    type AuthData,
    createAuthenticationMiddleware,
} from "../../src/middleware/authentication.ts";
import { UnauthorizedError } from "../../src/services/logging.ts";
import type { UserService } from "../../src/services/userService.ts";

describe("Authentication Middleware", () => {
    let req: Request;
    let res: Response;
    let next: Mock<(...args: unknown[]) => void>;
    let userService: UserService;
    let authenticationMiddleware: RequestHandler;

    beforeEach(async () => {
        mock.restoreAll();

        userService = {
            approve: mock.fn(),
            blacklist: mock.fn(),
            delete: mock.fn(),
            deleteProfile: mock.fn(),
            readCredentials: mock.fn(),
            getAll: mock.fn(),
            getProfile: mock.fn(),
            login: mock.fn(),
            register: mock.fn(),
        };

        authenticationMiddleware = createAuthenticationMiddleware({
            userService,
        });

        req = { headers: {}, url: "/api/resource" } as Request;
        res = {} as Response;
        next = mock.fn();
    });

    it("should skip authentication for /auth routes", () => {
        req.url = "/auth/login";
        authenticationMiddleware(req, res, next);
        assert.strictEqual(next.mock.calls.length, 1);
        assert.strictEqual(next.mock.calls[0]!.arguments.length, 0);
    });

    it("should throw UnauthorizedError if no token provided", () => {
        authenticationMiddleware(req, res, next);
        assert.strictEqual(next.mock.calls.length, 1);
        assert.ok(
            next.mock.calls[0]!.arguments[0] instanceof UnauthorizedError,
        );
    });

    it("should throw UnauthorizedError if token verification fails", () => {
        req.headers = { authorization: "invalid-token" };

        authenticationMiddleware(req, res, next);

        assert.strictEqual(next.mock.calls.length, 1);
        assert.ok(
            next.mock.calls[0]!.arguments[0] instanceof UnauthorizedError,
        );
    });

    it("should throw UnauthorizedError if user not found in database", async () => {
        const payload: AuthData = { userId: v4() };
        const authorization = jwt.sign(payload, process.env.JWT_SECRET!, {
            noTimestamp: true,
            expiresIn: "1h",
        });

        req.headers = { authorization };

        authenticationMiddleware = createAuthenticationMiddleware({
            userService: { ...userService, readCredentials: async () => [] },
        });

        authenticationMiddleware(req, res, next);

        await new Promise(process.nextTick);

        assert.strictEqual(next.mock.calls.length, 1);
        assert.ok(
            next.mock.calls[0]!.arguments[0] instanceof UnauthorizedError,
        );
    });

    it("should throw UnauthorizedError if user status is Pending (P)", async () => {
        const payload: AuthData = { userId: v4() };
        const authorization = jwt.sign(payload, process.env.JWT_SECRET!, {
            noTimestamp: true,
            expiresIn: "1h",
        });

        req.headers = { authorization };

        authenticationMiddleware = createAuthenticationMiddleware({
            userService: {
                ...userService,
                readCredentials: async () => [
                    { ...payload, status: "P", email: v4(), password: v4() },
                ],
            },
        });

        authenticationMiddleware(req, res, next);

        await new Promise(process.nextTick);

        assert.strictEqual(next.mock.calls.length, 1);
        assert.ok(
            next.mock.calls[0]!.arguments[0] instanceof UnauthorizedError,
        );
    });

    it("should throw UnauthorizedError if user status is Blocked (B)", async () => {
        const payload: AuthData = { userId: v4() };
        const authorization = jwt.sign(payload, process.env.JWT_SECRET!, {
            noTimestamp: true,
            expiresIn: "1h",
        });

        req.headers = { authorization };

        authenticationMiddleware = createAuthenticationMiddleware({
            userService: {
                ...userService,
                readCredentials: async () => [
                    { ...payload, status: "B", email: v4(), password: v4() },
                ],
            },
        });

        authenticationMiddleware(req, res, next);

        await new Promise(process.nextTick);

        assert.strictEqual(next.mock.calls.length, 1);
        assert.ok(
            next.mock.calls[0]!.arguments[0] instanceof UnauthorizedError,
        );
    });

    it("should authorise valid user", async () => {
        const payload: AuthData = { userId: v4() };
        const authorization = jwt.sign(payload, process.env.JWT_SECRET!, {
            noTimestamp: true,
            expiresIn: "1h",
        });

        req.headers = { authorization };

        authenticationMiddleware = createAuthenticationMiddleware({
            userService: {
                ...userService,
                readCredentials: async () => [
                    { ...payload, status: "M", email: v4(), password: v4() },
                ],
            },
        });

        authenticationMiddleware(req, res, next);

        await new Promise(process.nextTick);

        assert.strictEqual(next.mock.calls.length, 1);
        assert.strictEqual(next.mock.calls[0]!.arguments.length, 0);
        assert.equal(req.session.userId, payload.userId);
        assert.equal(req.session.status, "M");
    });
});
