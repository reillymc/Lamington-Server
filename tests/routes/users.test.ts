import { after, afterEach, beforeEach, describe, it, mock } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import { v4 } from "uuid";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexBookRepository } from "../../src/repositories/knex/knexBookRepository.ts";
import { KnexCookListRepository } from "../../src/repositories/knex/knexCooklistRepository.ts";
import { KnexListRepository } from "../../src/repositories/knex/knexListRepository.ts";
import { KnexPlannerRepository } from "../../src/repositories/knex/knexPlannerRepository.ts";
import { KnexRecipeRepository } from "../../src/repositories/knex/knexRecipeRepository.ts";
import { KnexUserRepository } from "../../src/repositories/knex/knexUserRepository.ts";
import type { components } from "../../src/routes/spec/index.ts";
import { SYSTEM_USER_ID } from "../../src/utils/systemUser.ts";
import {
    CreateUsers,
    PrepareAuthenticatedUser,
    randomCount,
} from "../helpers/index.ts";
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

describe("Get all users", () => {
    it("route should require authentication", async () => {
        const res = await request(app).get("/v1/users");

        expect(res.statusCode).toEqual(401);
    });

    it("route should fail for non-administrator", async () => {
        const [registeredToken] = await PrepareAuthenticatedUser(database, "M");
        const res = await request(app).get("/v1/users").set(registeredToken);
        expect(res.statusCode).toEqual(403);
    });

    it("route should return emails for request with administrator privileges", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");

        await CreateUsers(database, { count: 1, status: "M" });

        const res = await request(app).get("/v1/users").set(adminToken);

        expect(res.statusCode).toEqual(200);

        const adminData = res.body as components["schemas"]["User"][];

        expect(adminData[0]?.email).toBeDefined();
    });

    it("should return correct number of active users and no pending/blacklisted users", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");

        const usersRegistered = await CreateUsers(database, {
            count: randomCount,
            status: "M",
        });
        const usersAdmin = await CreateUsers(database, {
            count: randomCount,
            status: "A",
        });
        await CreateUsers(database, {
            count: randomCount,
            status: "P",
        });
        await CreateUsers(database, {
            count: randomCount,
            status: "B",
        });

        const res = await request(app).get("/v1/users").set(adminToken);

        expect(res.statusCode).toEqual(200);

        const data = res.body as components["schemas"]["User"][];

        expect(data.length).toEqual(usersRegistered.length + usersAdmin.length);

        const statuses = data.map(({ status }) => status);

        expect(statuses).not.toContain("P");
        expect(statuses).not.toContain("B");
    });

    it("should not return current authenticated user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");

        const res = await request(app).get("/v1/users").set(adminToken);

        expect(res.statusCode).toEqual(200);

        const data = res.body as components["schemas"]["User"][];

        expect(data.length).toEqual(0);
    });

    it("should return correct number of pending users when filtered", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");

        const users = await CreateUsers(database, {
            count: Math.floor(Math.random() * 10) + 1,
            status: "P",
        });

        await CreateUsers(database, {
            count: Math.floor(Math.random() * 10) + 1,
            status: "M",
        });

        const res = await request(app)
            .get("/v1/users")
            .query({ status: "P" })
            .set(adminToken);

        expect(res.statusCode).toEqual(200);

        const data = res.body as components["schemas"]["User"][];

        expect(data.length).toEqual(users.length);
        expect(data.every((u) => u.status === "P")).toBe(true);
    });

    it("should not return the system user when filtering by status", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");

        const res = await request(app)
            .get("/v1/users")
            .query({ status: "B" })
            .set(adminToken);

        expect(res.statusCode).toEqual(200);

        const data = res.body as components["schemas"]["User"][];

        expect(data.map(({ userId }) => userId)).not.toContain(SYSTEM_USER_ID);
    });
});

describe("Delete user", () => {
    it("route should require authentication", async () => {
        const [_, { userId }] = await PrepareAuthenticatedUser(database, "M");

        const res = await request(app).delete(`/v1/users/${userId}`);

        expect(res.statusCode).toEqual(401);
    });

    it("should not allow deletion of user if not admin", async () => {
        const [_, { userId }] = await PrepareAuthenticatedUser(database, "M");
        const [otherToken] = await PrepareAuthenticatedUser(database, "M");

        const response = await request(app)
            .delete(`/v1/users/${userId}`)
            .set(otherToken);

        expect(response.statusCode).toEqual(403);
    });

    it("should delete user (Admin)", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");
        const [userToDelete] = await CreateUsers(database);

        const response = await request(app)
            .delete(`/v1/users/${userToDelete!.userId}`)
            .set(adminToken);
        expect(response.statusCode).toEqual(204);

        const { users } = await KnexUserRepository.read(database, {
            users: [{ userId: userToDelete!.userId }],
        });
        expect(users.length).toEqual(1);
        expect(users[0]!.status).toEqual("D");
    });

    it("should reject deleting the system user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");

        const response = await request(app)
            .delete(`/v1/users/${SYSTEM_USER_ID}`)
            .set(adminToken);

        expect(response.statusCode).toEqual(404);

        const { users } = await KnexUserRepository.read(database, {
            users: [{ userId: SYSTEM_USER_ID }],
        });
        expect(users.length).toEqual(1);
        expect(users[0]!.status).toEqual("B");
    });

    it("should retain content when soft deleting a user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");
        const [userToDelete] = await CreateUsers(database);
        const userId = userToDelete!.userId;

        await KnexBookRepository.create(database, {
            userId,
            books: [{ name: v4() }],
        });
        await KnexListRepository.create(database, {
            userId,
            lists: [{ name: v4() }],
        });
        await KnexPlannerRepository.create(database, {
            userId,
            planners: [{ name: v4() }],
        });
        await KnexCookListRepository.createMeals(database, {
            userId,
            meals: [{ course: "breakfast" }],
        });
        await KnexRecipeRepository.create(database, {
            userId,
            recipes: [{ name: v4() }],
        });

        const response = await request(app)
            .delete(`/v1/users/${userId}`)
            .set(adminToken);

        expect(response.statusCode).toEqual(204);

        const { users } = await KnexUserRepository.read(database, {
            users: [{ userId }],
        });
        expect(users[0]!.status).toEqual("D");

        const content = await database("content").where({ createdBy: userId });
        expect(content.length).toBeGreaterThan(0);
    });
});

describe("Approve user", () => {
    it("route should require authentication", async () => {
        const endpoint = `/v1/users/${v4()}/approve`; // Non-existent user
        const res = await request(app).post(endpoint);
        expect(res.statusCode).toEqual(401);
    });

    it("route should require administrator privileges", async () => {
        const [registeredToken] = await PrepareAuthenticatedUser(database, "M");
        const endpoint = `/v1/users/${v4()}/approve`; // Non-existent user
        const res = await request(app).post(endpoint).set(registeredToken);
        expect(res.statusCode).toEqual(403);
    });

    it("should return 404 for non-existent user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");
        const endpoint = `/v1/users/${v4()}/approve`; // Non-existent user
        const res = await request(app).post(endpoint).set(adminToken);
        expect(res.statusCode).toEqual(404);
    });

    it("should reject approving the system user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");

        const res = await request(app)
            .post(`/v1/users/${SYSTEM_USER_ID}/approve`)
            .set(adminToken);

        expect(res.statusCode).toEqual(404);

        const { users } = await KnexUserRepository.read(database, {
            users: [{ userId: SYSTEM_USER_ID }],
        });
        expect(users[0]!.status).toEqual("B");
    });

    it("should register pending user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");

        const [user] = await CreateUsers(database, {
            status: "P",
        });
        const response = await request(app)
            .post(`/v1/users/${user!.userId}/approve`)
            .set(adminToken);

        expect(response.statusCode).toEqual(204);

        const {
            users: [updatedUser],
        } = await KnexUserRepository.read(database, { users: [user!] });

        expect(updatedUser?.status).toEqual("M");
    });

    it("should trigger the starter data job when approving a pending user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");

        const [user] = await CreateUsers(database, {
            status: "P",
        });

        const runStarterData = mock.fn(async (_userId: string) => true);
        const app = createTestApp({
            database,
            jobs: {
                createUserStarterData: { run: runStarterData },
            },
        });

        const response = await request(app)
            .post(`/v1/users/${user!.userId}/approve`)
            .set(adminToken);

        expect(response.statusCode).toEqual(204);
        expect(runStarterData.mock.calls).toHaveLength(1);
        expect(runStarterData.mock.calls[0]?.arguments).toEqual([user!.userId]);
    });

    it("should not trigger the starter data job when approving a registered user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");

        const [user] = await CreateUsers(database, {
            status: "M",
        });

        const runStarterData = mock.fn(async (_userId: string) => true);
        const app = createTestApp({
            database,
            jobs: {
                createUserStarterData: { run: runStarterData },
            },
        });

        const response = await request(app)
            .post(`/v1/users/${user!.userId}/approve`)
            .set(adminToken);

        expect(response.statusCode).toEqual(204);
        expect(runStarterData.mock.calls).toHaveLength(0);
    });
});

describe("Blacklist user", () => {
    it("route should require authentication", async () => {
        const endpoint = `/v1/users/${v4()}/blacklist`;
        const res = await request(app).post(endpoint);
        expect(res.statusCode).toEqual(401);
    });

    it("route should require administrator privileges", async () => {
        const [registeredToken] = await PrepareAuthenticatedUser(database, "M");
        const endpoint = `/v1/users/${v4()}/blacklist`;
        const res = await request(app).post(endpoint).set(registeredToken);
        expect(res.statusCode).toEqual(403);
    });

    it("should return 404 for non-existent user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");
        const endpoint = `/v1/users/${v4()}/blacklist`;
        const res = await request(app).post(endpoint).set(adminToken);
        expect(res.statusCode).toEqual(404);
    });

    it("should reject blacklisting the system user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");

        const res = await request(app)
            .post(`/v1/users/${SYSTEM_USER_ID}/blacklist`)
            .set(adminToken);

        expect(res.statusCode).toEqual(404);

        const { users } = await KnexUserRepository.read(database, {
            users: [{ userId: SYSTEM_USER_ID }],
        });
        expect(users[0]!.status).toEqual("B");
    });

    it("should blacklist pending user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");

        const [user] = await CreateUsers(database, {
            status: "P",
        });
        const response = await request(app)
            .post(`/v1/users/${user!.userId}/blacklist`)
            .set(adminToken);

        expect(response.statusCode).toEqual(204);

        const {
            users: [updatedUser],
        } = await KnexUserRepository.read(database, { users: [user!] });

        expect(updatedUser?.status).toEqual("B");
    });

    it("should blacklist registered user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");

        const [user] = await CreateUsers(database, {
            status: "M",
        });
        const response = await request(app)
            .post(`/v1/users/${user!.userId}/blacklist`)
            .set(adminToken);

        expect(response.statusCode).toEqual(204);

        const {
            users: [updatedUser],
        } = await KnexUserRepository.read(database, { users: [user!] });

        expect(updatedUser?.status).toEqual("B");
    });

    it("should blacklist admin user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");

        const [user] = await CreateUsers(database, {
            status: "A",
        });
        const response = await request(app)
            .post(`/v1/users/${user!.userId}/blacklist`)
            .set(adminToken);

        expect(response.statusCode).toEqual(204);

        const {
            users: [updatedUser],
        } = await KnexUserRepository.read(database, { users: [user!] });

        expect(updatedUser?.status).toEqual("B");
    });
});
