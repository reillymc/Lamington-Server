import { after, afterEach, beforeEach, describe, it } from "node:test";
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
    });

    it("should delete user and accommodate foreign keys", async () => {
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

    it("should register pending user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");

        const [user] = await CreateUsers(database, {
            status: "P",
        });
        if (!user) throw new Error("User not created");

        const response = await request(app)
            .post(`/v1/users/${user.userId}/approve`)
            .set(adminToken);

        expect(response.statusCode).toEqual(204);

        const {
            users: [updatedUser],
        } = await KnexUserRepository.read(database, { users: [user] });

        expect(updatedUser?.status).toEqual("M");
    });

    it("should create sample data for pending => registered user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");

        const [user] = await CreateUsers(database, {
            status: "P",
        });
        if (!user) throw new Error("User not created");

        const response = await request(app)
            .post(`/v1/users/${user.userId}/approve`)
            .set(adminToken)
            .send({ accept: true });
        expect(response.statusCode).toEqual(204);

        const {
            users: [updatedUser],
        } = await KnexUserRepository.read(database, { users: [user] });
        expect(updatedUser?.status).toEqual("M");

        const { lists } = await KnexListRepository.readAll(database, user);
        expect(lists.length).toEqual(1);

        const [list] = lists;
        expect(list!.owner.userId).toEqual(user.userId);

        const { items } = await KnexListRepository.readAllItems(database, {
            userId: user.userId,
            filter: list!,
        });
        expect(items.length).toEqual(1);

        const { books } = await KnexBookRepository.readAll(database, user);
        expect(books.length).toEqual(1);

        const [book] = books;
        expect(book!.owner.userId).toEqual(user.userId);

        const { recipes } = await KnexRecipeRepository.readAll(database, {
            userId: user.userId,
            filter: { books: [book!] },
        });
        expect(recipes.length).toEqual(1);

        const [recipe] = recipes;
        if (!recipe) throw new Error("Recipe/BookRecipe not created");
        expect(recipe.owner.userId).toEqual(user.userId);

        const { planners } = await KnexPlannerRepository.readAll(
            database,
            user,
        );
        expect(planners.length).toEqual(1);

        const [planner] = planners;
        expect(planner!.owner.userId).toEqual(user.userId);

        const { meals } = await KnexPlannerRepository.readAllMeals(database, {
            userId: user.userId,
            filter: planner!,
        });
        expect(meals.length).toEqual(2);

        const [meal1, meal2] = meals;
        expect(meal1!.owner.userId).toEqual(user.userId);
        expect(meal2!.owner.userId).toEqual(user.userId);
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

    it("should blacklist pending user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");

        const [user] = await CreateUsers(database, {
            status: "P",
        });
        if (!user) throw new Error("User not created");

        const response = await request(app)
            .post(`/v1/users/${user.userId}/blacklist`)
            .set(adminToken);

        expect(response.statusCode).toEqual(204);

        const {
            users: [updatedUser],
        } = await KnexUserRepository.read(database, { users: [user] });

        expect(updatedUser?.status).toEqual("B");
    });

    it("should blacklist registered user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");

        const [user] = await CreateUsers(database, {
            status: "M",
        });
        if (!user) throw new Error("User not created");

        const response = await request(app)
            .post(`/v1/users/${user.userId}/blacklist`)
            .set(adminToken);

        expect(response.statusCode).toEqual(204);

        const {
            users: [updatedUser],
        } = await KnexUserRepository.read(database, { users: [user] });

        expect(updatedUser?.status).toEqual("B");
    });

    it("should blacklist admin user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(database, "A");

        const [user] = await CreateUsers(database, {
            status: "A",
        });
        if (!user) throw new Error("User not created");

        const response = await request(app)
            .post(`/v1/users/${user.userId}/blacklist`)
            .set(adminToken);

        expect(response.statusCode).toEqual(204);

        const {
            users: [updatedUser],
        } = await KnexUserRepository.read(database, { users: [user] });

        expect(updatedUser?.status).toEqual("B");
    });
});
