import { afterEach, beforeEach, describe, mock } from "node:test";
import { expect } from "expect";
import request from "supertest";
import { v4 } from "uuid";
import type { components } from "../../src/routes/spec/index.ts";
import {
    CreateUsers,
    PrepareAuthenticatedUser,
    randomCount,
} from "../helpers/index.ts";
import {
    beginTestTransaction,
    createTestApp,
    rollbackTestTransaction,
    TestContext,
    withCxIt,
} from "../helpers/setup.ts";

let {
    app,
    bookRepository,
    cooklistRepository,
    listRepository,
    plannerRepository,
    recipeRepository,
    userRepository,
} = TestContext;

beforeEach(async () => {
    await beginTestTransaction();
    ({
        app,
        bookRepository,
        cooklistRepository,
        listRepository,
        plannerRepository,
        recipeRepository,
        userRepository,
    } = createTestApp({}));
});

afterEach(async () => {
    await rollbackTestTransaction();
});

describe("Get all users", () => {
    withCxIt("route should require authentication", async () => {
        const res = await request(app).get("/v1/users");

        expect(res.statusCode).toEqual(401);
    });

    withCxIt("route should fail for non-administrator", async () => {
        const [registeredToken] = await PrepareAuthenticatedUser(
            userRepository,
            "M",
        );
        const res = await request(app).get("/v1/users").set(registeredToken);
        expect(res.statusCode).toEqual(403);
    });

    withCxIt(
        "route should return emails for request with administrator privileges",
        async () => {
            const [adminToken] = await PrepareAuthenticatedUser(
                userRepository,
                "A",
            );

            await CreateUsers(userRepository, {
                count: 1,
                status: "M",
            });

            const res = await request(app).get("/v1/users").set(adminToken);

            expect(res.statusCode).toEqual(200);

            const adminData = res.body as components["schemas"]["User"][];

            expect(adminData[0]?.email).toBeDefined();
        },
    );

    withCxIt(
        "should return correct number of active users and no pending/blacklisted users",
        async () => {
            const [adminToken] = await PrepareAuthenticatedUser(
                userRepository,
                "A",
            );

            const usersRegistered = await CreateUsers(userRepository, {
                count: randomCount,
                status: "M",
            });
            const usersAdmin = await CreateUsers(userRepository, {
                count: randomCount,
                status: "A",
            });
            await CreateUsers(userRepository, {
                count: randomCount,
                status: "P",
            });
            await CreateUsers(userRepository, {
                count: randomCount,
                status: "B",
            });

            const res = await request(app).get("/v1/users").set(adminToken);

            expect(res.statusCode).toEqual(200);

            const data = res.body as components["schemas"]["User"][];

            expect(data.length).toEqual(
                usersRegistered.length + usersAdmin.length,
            );

            const statuses = data.map(({ status }) => status);

            expect(statuses).not.toContain("P");
            expect(statuses).not.toContain("B");
        },
    );

    withCxIt("should not return current authenticated user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(
            userRepository,
            "A",
        );

        const res = await request(app).get("/v1/users").set(adminToken);

        expect(res.statusCode).toEqual(200);

        const data = res.body as components["schemas"]["User"][];

        expect(data.length).toEqual(0);
    });

    withCxIt(
        "should return correct number of pending users when filtered",
        async () => {
            const [adminToken] = await PrepareAuthenticatedUser(
                userRepository,
                "A",
            );

            const users = await CreateUsers(userRepository, {
                count: Math.floor(Math.random() * 10) + 1,
                status: "P",
            });

            await CreateUsers(userRepository, {
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
        },
    );
});

describe("Delete user", () => {
    withCxIt("route should require authentication", async () => {
        const [_, { userId }] = await PrepareAuthenticatedUser(
            userRepository,
            "M",
        );

        const res = await request(app).delete(`/v1/users/${userId}`);

        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should not allow deletion of user if not admin", async () => {
        const [_, { userId }] = await PrepareAuthenticatedUser(
            userRepository,
            "M",
        );
        const [otherToken] = await PrepareAuthenticatedUser(
            userRepository,
            "M",
        );

        const response = await request(app)
            .delete(`/v1/users/${userId}`)
            .set(otherToken);

        expect(response.statusCode).toEqual(403);
    });

    withCxIt("should delete user (Admin)", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(
            userRepository,
            "A",
        );
        const [userToDelete] = await CreateUsers(userRepository);

        const response = await request(app)
            .delete(`/v1/users/${userToDelete!.userId}`)
            .set(adminToken);
        expect(response.statusCode).toEqual(204);
    });

    withCxIt("should delete user and accommodate foreign keys", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(
            userRepository,
            "A",
        );
        const [userToDelete] = await CreateUsers(userRepository);
        const userId = userToDelete!.userId;

        await bookRepository.create({
            userId,
            books: [{ name: v4() }],
        });
        await listRepository.create({
            userId,
            lists: [{ name: v4() }],
        });
        await plannerRepository.create({
            userId,
            planners: [{ name: v4() }],
        });
        await cooklistRepository.createMeals({
            userId,
            meals: [{ course: "breakfast" }],
        });
        await recipeRepository.create({
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
    withCxIt("route should require authentication", async () => {
        const endpoint = `/v1/users/${v4()}/approve`; // Non-existent user
        const res = await request(app).post(endpoint);
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("route should require administrator privileges", async () => {
        const [registeredToken] = await PrepareAuthenticatedUser(
            userRepository,
            "M",
        );
        const endpoint = `/v1/users/${v4()}/approve`; // Non-existent user
        const res = await request(app).post(endpoint).set(registeredToken);
        expect(res.statusCode).toEqual(403);
    });

    withCxIt("should return 404 for non-existent user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(
            userRepository,
            "A",
        );
        const endpoint = `/v1/users/${v4()}/approve`; // Non-existent user
        const res = await request(app).post(endpoint).set(adminToken);
        expect(res.statusCode).toEqual(404);
    });

    withCxIt("should register pending user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(
            userRepository,
            "A",
        );

        const [user] = await CreateUsers(userRepository, {
            status: "P",
        });
        const response = await request(app)
            .post(`/v1/users/${user!.userId}/approve`)
            .set(adminToken);

        expect(response.statusCode).toEqual(204);

        const {
            users: [updatedUser],
        } = await userRepository.read({ users: [user!] });

        expect(updatedUser?.status).toEqual("M");
    });

    withCxIt(
        "should trigger the starter data job when approving a pending user",
        async () => {
            const [adminToken] = await PrepareAuthenticatedUser(
                userRepository,
                "A",
            );

            const [user] = await CreateUsers(userRepository, {
                status: "P",
            });

            const runStarterData = mock.fn(async (_userId: string) => true);
            ({
                app,
                bookRepository,
                cooklistRepository,
                listRepository,
                plannerRepository,
                recipeRepository,
                userRepository,
            } = createTestApp({
                jobs: {
                    createUserStarterData: { run: runStarterData },
                },
            }));

            const response = await request(app)
                .post(`/v1/users/${user!.userId}/approve`)
                .set(adminToken);

            expect(response.statusCode).toEqual(204);
            expect(runStarterData.mock.calls).toHaveLength(1);
            expect(runStarterData.mock.calls[0]?.arguments).toEqual([
                user!.userId,
            ]);
        },
    );

    withCxIt(
        "should not trigger the starter data job when approving a registered user",
        async () => {
            const [adminToken] = await PrepareAuthenticatedUser(
                userRepository,
                "A",
            );

            const [user] = await CreateUsers(userRepository, {
                status: "M",
            });

            const runStarterData = mock.fn(async (_userId: string) => true);
            ({
                app,
                bookRepository,
                cooklistRepository,
                listRepository,
                plannerRepository,
                recipeRepository,
                userRepository,
            } = createTestApp({
                jobs: {
                    createUserStarterData: { run: runStarterData },
                },
            }));

            const response = await request(app)
                .post(`/v1/users/${user!.userId}/approve`)
                .set(adminToken);

            expect(response.statusCode).toEqual(204);
            expect(runStarterData.mock.calls).toHaveLength(0);
        },
    );
});

describe("Blacklist user", () => {
    withCxIt("route should require authentication", async () => {
        const endpoint = `/v1/users/${v4()}/blacklist`;
        const res = await request(app).post(endpoint);
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("route should require administrator privileges", async () => {
        const [registeredToken] = await PrepareAuthenticatedUser(
            userRepository,
            "M",
        );
        const endpoint = `/v1/users/${v4()}/blacklist`;
        const res = await request(app).post(endpoint).set(registeredToken);
        expect(res.statusCode).toEqual(403);
    });

    withCxIt("should return 404 for non-existent user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(
            userRepository,
            "A",
        );
        const endpoint = `/v1/users/${v4()}/blacklist`;
        const res = await request(app).post(endpoint).set(adminToken);
        expect(res.statusCode).toEqual(404);
    });

    withCxIt("should blacklist pending user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(
            userRepository,
            "A",
        );

        const [user] = await CreateUsers(userRepository, {
            status: "P",
        });
        const response = await request(app)
            .post(`/v1/users/${user!.userId}/blacklist`)
            .set(adminToken);

        expect(response.statusCode).toEqual(204);

        const {
            users: [updatedUser],
        } = await userRepository.read({ users: [user!] });

        expect(updatedUser?.status).toEqual("B");
    });

    withCxIt("should blacklist registered user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(
            userRepository,
            "A",
        );

        const [user] = await CreateUsers(userRepository, {
            status: "M",
        });
        const response = await request(app)
            .post(`/v1/users/${user!.userId}/blacklist`)
            .set(adminToken);

        expect(response.statusCode).toEqual(204);

        const {
            users: [updatedUser],
        } = await userRepository.read({ users: [user!] });

        expect(updatedUser?.status).toEqual("B");
    });

    withCxIt("should blacklist admin user", async () => {
        const [adminToken] = await PrepareAuthenticatedUser(
            userRepository,
            "A",
        );

        const [user] = await CreateUsers(userRepository, {
            status: "A",
        });
        const response = await request(app)
            .post(`/v1/users/${user!.userId}/blacklist`)
            .set(adminToken);

        expect(response.statusCode).toEqual(204);

        const {
            users: [updatedUser],
        } = await userRepository.read({ users: [user!] });

        expect(updatedUser?.status).toEqual("B");
    });
});
