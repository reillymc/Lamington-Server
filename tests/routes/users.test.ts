import { expect } from "expect";
import type { Express } from "express";
import { before, describe, it } from "node:test";
import request from "supertest";

import { setupApp } from "../../src/app.ts";
import { ListItemActions } from "../../src/controllers/listItem.ts";
import { PlannerActions } from "../../src/controllers/planner.ts";
import { InternalPlannerMealActions } from "../../src/controllers/plannerMeal.ts";
import { UserActions } from "../../src/controllers/user.ts";
import {
    type GetPendingUsersResponse,
    type GetUsersResponse,
    type PostUserApprovalRequestBody,
    UserStatus,
} from "../../src/routes/spec/index.ts";
import {
    CreateBooks,
    CreateIngredients,
    CreateLists,
    CreateUsers,
    PrepareAuthenticatedUser,
    UserEndpoint,
    randomCount,
    readAllLists,
} from "../helpers/index.ts";
import { default as knexDb, type KnexDatabase } from "../../src/database/index.ts";
import { KnexBookRepository } from "../../src/repositories/knex/knexBookRepository.ts";
import { KnexRecipeRepository } from "../../src/repositories/knex/knexRecipeRepository.ts";

const db = knexDb as KnexDatabase;

describe("get users", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).get(UserEndpoint.getUsers);

        expect(res.statusCode).toEqual(401);
    });

    it("route should return emails only for request with administrator privileges", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(db, UserStatus.Administrator);
        const [registeredToken] = await PrepareAuthenticatedUser(db, UserStatus.Member);

        await CreateUsers(db, { count: 1, status: UserStatus.Member });

        const registeredRes = await request(app).get(UserEndpoint.getUsers).set(registeredToken);

        expect(registeredRes.statusCode).toEqual(200);

        const { data } = registeredRes.body as GetUsersResponse;

        expect(Object.values(data ?? {})[0]?.email).toBeUndefined();

        const adminRes = await request(app).get(UserEndpoint.getUsers).set(adminToken);

        expect(adminRes.statusCode).toEqual(200);

        const { data: adminData } = adminRes.body as GetUsersResponse;

        expect(Object.values(adminData ?? {})[0]?.email).toBeDefined();
    });

    it("should return correct number of active users and no pending/blacklisted users", async () => {
        const [registeredToken] = await PrepareAuthenticatedUser(db, UserStatus.Member);

        const usersRegistered = await CreateUsers(db, { count: randomCount, status: UserStatus.Member });
        const usersAdmin = await CreateUsers(db, { count: randomCount, status: UserStatus.Administrator });
        await CreateUsers(db, { count: randomCount, status: UserStatus.Pending });
        await CreateUsers(db, { count: randomCount, status: UserStatus.Blacklisted });

        const res = await request(app).get(UserEndpoint.getUsers).set(registeredToken);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetUsersResponse;

        expect(Object.keys(data ?? {}).length).toEqual(usersRegistered.length + usersAdmin.length);

        const statuses = Object.values(data ?? {}).map(({ status }) => status);

        expect(statuses).not.toContain(UserStatus.Pending);
        expect(statuses).not.toContain(UserStatus.Blacklisted);
    });

    it("should not return current authenticated user", async () => {
        const [registeredToken] = await PrepareAuthenticatedUser(db, UserStatus.Member);

        const res = await request(app).get(UserEndpoint.getUsers).set(registeredToken);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetUsersResponse;

        expect(Object.keys(data ?? {}).length).toEqual(0);
    });
});

describe("get pending users", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).get(UserEndpoint.getPendingUsers);

        expect(res.statusCode).toEqual(401);
    });

    it("route should require administrator privileges", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(db, UserStatus.Administrator);
        const [registeredToken] = await PrepareAuthenticatedUser(db, UserStatus.Member);

        const registeredRes = await request(app).get(UserEndpoint.getPendingUsers).set(registeredToken);

        expect(registeredRes.statusCode).toEqual(401);

        const adminRes = await request(app).get(UserEndpoint.getPendingUsers).set(adminToken);

        expect(adminRes.statusCode).toEqual(200);
    });

    it("should return correct number of pending users", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(db, UserStatus.Administrator);

        const users = await CreateUsers(db, { count: Math.floor(Math.random() * 10) + 1, status: UserStatus.Pending });

        const res = await request(app).get(UserEndpoint.getPendingUsers).set(adminToken);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetPendingUsersResponse;

        expect(Object.keys(data ?? {}).length).toEqual(users.length);
    });
});

describe("delete users", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const [_, { userId }] = await PrepareAuthenticatedUser(db, UserStatus.Member);

        const res = await request(app).delete(UserEndpoint.deleteUsers(userId));

        expect(res.statusCode).toEqual(401);
    });

    it("should not allow deletion of other user", async () => {
        const [_, { userId }] = await PrepareAuthenticatedUser(db, UserStatus.Member);
        const [otherToken] = await PrepareAuthenticatedUser(db, UserStatus.Member);

        const response = await request(app).delete(UserEndpoint.deleteUsers(userId)).set(otherToken);

        expect(response.statusCode).toEqual(401);
    });

    it("should delete user", async () => {
        const [token, { userId }] = await PrepareAuthenticatedUser(db, UserStatus.Member);

        const response = await request(app).delete(UserEndpoint.deleteUsers(userId)).set(token);

        expect(response.statusCode).toEqual(200);
    });

    it("should delete user and accommodate foreign keys", async () => {
        const [token, { userId }] = await PrepareAuthenticatedUser(db, UserStatus.Member);

        await CreateBooks(db, { userId });
        await CreateLists({ createdBy: userId });
        await CreateIngredients({ createdBy: userId });

        const response = await request(app).delete(UserEndpoint.deleteUsers(userId)).set(token);

        expect(response.statusCode).toEqual(200);
    });
});

describe("approve user", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("route should require admin authentication", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(db, UserStatus.Administrator);
        const [registeredToken] = await PrepareAuthenticatedUser(db, UserStatus.Member);

        const endpoint = UserEndpoint.approveUser("00000000-0000-0000-0000-000000000000"); // Non-existent user

        const unAuthedResponse = await request(app).post(endpoint);
        expect(unAuthedResponse.statusCode).toEqual(401);

        const registeredResponse = await request(app).post(endpoint).set(registeredToken);
        expect(registeredResponse.statusCode).toEqual(401);

        const adminResponse = await request(app).post(endpoint).set(adminToken);
        expect(adminResponse.statusCode).toEqual(400);
    });

    it("should register pending user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(db, UserStatus.Administrator);

        const [user] = await CreateUsers(db, { status: UserStatus.Pending });
        if (!user) throw new Error("User not created");

        const response = await request(app)
            .post(UserEndpoint.approveUser(user.userId))
            .set(adminToken)
            .send({ accept: true } as PostUserApprovalRequestBody);

        expect(response.statusCode).toEqual(200);

        const [updatedUser] = await UserActions.read(db, { userId: user.userId });

        expect(updatedUser?.status).toEqual(UserStatus.Member);
    });

    it("should blacklist pending user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(db, UserStatus.Administrator);

        const [user] = await CreateUsers(db, { status: UserStatus.Pending });
        if (!user) throw new Error("User not created");

        const response = await request(app)
            .post(UserEndpoint.approveUser(user.userId))
            .set(adminToken)
            .send({ accept: false } as PostUserApprovalRequestBody);

        expect(response.statusCode).toEqual(200);

        const [updatedUser] = await UserActions.read(db, { userId: user.userId });

        expect(updatedUser?.status).toEqual(UserStatus.Blacklisted);
    });

    it("should blacklist registered user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(db, UserStatus.Administrator);

        const [user] = await CreateUsers(db, { status: UserStatus.Member });
        if (!user) throw new Error("User not created");

        const response = await request(app)
            .post(UserEndpoint.approveUser(user.userId))
            .set(adminToken)
            .send({ accept: false } as PostUserApprovalRequestBody);

        expect(response.statusCode).toEqual(200);

        const [updatedUser] = await UserActions.read(db, { userId: user.userId });

        expect(updatedUser?.status).toEqual(UserStatus.Blacklisted);
    });

    it("should blacklist admin user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(db, UserStatus.Administrator);

        const [user] = await CreateUsers(db, { status: UserStatus.Administrator });
        if (!user) throw new Error("User not created");

        const response = await request(app)
            .post(UserEndpoint.approveUser(user.userId))
            .set(adminToken)
            .send({ accept: false } as PostUserApprovalRequestBody);

        expect(response.statusCode).toEqual(200);

        const [updatedUser] = await UserActions.read(db, { userId: user.userId });

        expect(updatedUser?.status).toEqual(UserStatus.Blacklisted);
    });

    it("should create sample data for pending => registered user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(db, UserStatus.Administrator);

        const [user] = await CreateUsers(db, { status: UserStatus.Pending });
        if (!user) throw new Error("User not created");

        const response = await request(app)
            .post(UserEndpoint.approveUser(user.userId))
            .set(adminToken)
            .send({ accept: true } as PostUserApprovalRequestBody);
        expect(response.statusCode).toEqual(200);

        const [updatedUser] = await UserActions.read(db, { userId: user.userId });
        expect(updatedUser?.status).toEqual(UserStatus.Member);

        const lists = await readAllLists();
        expect(lists.length).toEqual(1);

        const [list] = lists;
        if (!list) throw new Error("List not created");
        expect(list.createdBy).toEqual(user.userId);

        const listItems = await ListItemActions.Read({ listId: list.listId });
        expect(listItems.length).toEqual(1);

        const { books } = await KnexBookRepository.readAll(db, { userId: user.userId });
        expect(books.length).toEqual(1);

        const [book] = books;
        if (!book) throw new Error("Book not created");
        expect(book.owner.userId).toEqual(user.userId);

        const { recipes } = await KnexRecipeRepository.readAll(db, { userId: user.userId, filter: { books: [book] } });
        expect(recipes.length).toEqual(1);

        const [recipe] = recipes;
        if (!recipe) throw new Error("Recipe/BookRecipe not created");
        expect(recipe.owner.userId).toEqual(user.userId);

        const planners = await PlannerActions.ReadByUser({ userId: user.userId });
        expect(planners.length).toEqual(1);

        const [planner] = planners;
        if (!planner) throw new Error("Planner not created");
        expect(planner.createdBy).toEqual(user.userId);

        const meals = await InternalPlannerMealActions.readAll({ plannerId: planner.plannerId });
        expect(meals.length).toEqual(2);

        const [meal1, meal2] = meals;
        if (!meal1 || !meal2) throw new Error("PlannerMeal not created");
        expect(meal1.createdBy).toEqual(user.userId);
        expect(meal2.createdBy).toEqual(user.userId);
    });
});
