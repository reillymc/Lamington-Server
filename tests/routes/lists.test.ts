import { after, afterEach, beforeEach, describe, it } from "node:test";
import { expect } from "expect";
import type { Express } from "express";
import request from "supertest";
import { v4 as uuid } from "uuid";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexListRepository } from "../../src/repositories/knex/knexListRepository.ts";
import type { components } from "../../src/routes/spec/index.ts";
import { CreateUsers, PrepareAuthenticatedUser } from "../helpers/index.ts";
import { createTestApp, db } from "../helpers/setup.ts";

const randomIcon = () =>
    (["variant1", "variant2", "variant3"] as const)[
        Math.floor(Math.random() * 3)
    ];

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

describe("Get user lists", () => {
    it("should require authentication", async () => {
        const res = await request(app).get("/v1/lists");
        expect(res.statusCode).toEqual(401);
    });

    it("should return all lists created by the user", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }, { name: uuid() }, { name: uuid() }],
        });

        const res = await request(app).get("/v1/lists").set(token);
        expect(res.statusCode).toEqual(200);

        const body = res.body as components["schemas"]["ListSummary"][];
        expect(body).toHaveLength(3);

        const ids = body.map((l) => l.listId);
        expect(ids).toContain(lists[0]!.listId);
        expect(ids).toContain(lists[1]!.listId);
        expect(ids).toContain(lists[2]!.listId);
    });

    it("should return lists a user is a member of", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: otherUser!.userId,
            lists: [{ name: uuid() }, { name: uuid() }, { name: uuid() }],
        });
        const [adminList, memberList, pendingList] = lists;

        await KnexListRepository.saveMembers(database, [
            {
                listId: adminList!.listId,
                members: [{ userId: user.userId, status: "A" }],
            },
            {
                listId: memberList!.listId,
                members: [{ userId: user.userId, status: "M" }],
            },
            {
                listId: pendingList!.listId,
                members: [{ userId: user.userId, status: "P" }],
            },
        ]);

        const res = await request(app).get("/v1/lists").set(token);
        expect(res.statusCode).toEqual(200);

        const body = res.body as components["schemas"]["ListSummary"][];
        const ids = body.map((l) => l.listId);

        expect(ids).toContain(adminList!.listId);
        expect(ids).toContain(memberList!.listId);
        expect(ids).toContain(pendingList!.listId);
    });

    it("should not return lists where the user is blacklisted", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: otherUser!.userId,
            lists: [{ name: uuid() }],
        });
        const [blockedList] = lists;

        await KnexListRepository.saveMembers(database, [
            {
                listId: blockedList!.listId,
                members: [{ userId: user.userId, status: "B" }],
            },
        ]);

        const res = await request(app).get("/v1/lists").set(token);
        expect(res.statusCode).toEqual(200);

        const body = res.body as components["schemas"]["ListSummary"][];
        const ids = body.map((l) => l.listId);

        expect(ids).not.toContain(blockedList!.listId);
    });

    it("should not return lists belonging to other users", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: otherUser!.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app).get("/v1/lists").set(token);
        expect(res.statusCode).toEqual(200);

        const body = res.body as components["schemas"]["ListSummary"][];
        const found = body.find((l) => l.listId === lists[0]!.listId);
        expect(found).toBeUndefined();
    });
});

describe("Create a list", () => {
    it("should require authentication", async () => {
        const res = await request(app).post("/v1/lists");
        expect(res.statusCode).toEqual(401);
    });

    it("should successfully create a new list", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const listData = {
            name: uuid(),
            description: uuid(),
            icon: randomIcon(),
        } satisfies components["schemas"]["ListCreate"];

        const res = await request(app)
            .post("/v1/lists")
            .set(token)
            .send(listData);

        expect(res.statusCode).toEqual(201);

        const { lists: savedLists } = await KnexListRepository.readAll(
            database,
            { userId: user.userId },
        );
        expect(savedLists.length).toEqual(1);

        const [savedList] = savedLists;
        expect(savedList?.name).toEqual(listData.name);
        expect(savedList?.description).toEqual(listData.description);
        expect(savedList?.icon).toEqual(listData.icon);
        expect(savedList?.owner.userId).toEqual(user.userId);
    });

    it("should fail if the request contains invalid properties", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const res = await request(app).post("/v1/lists").set(token).send({
            name: 12345,
            description: uuid(),
        });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if the request contains extraneous properties", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const res = await request(app).post("/v1/lists").set(token).send({
            name: uuid(),
            extra: "invalid",
        });
        expect(res.statusCode).toEqual(400);
    });
});

describe("Get a list", () => {
    it("should require authentication", async () => {
        const res = await request(app).get(`/v1/lists/${uuid()}`);
        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent list", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const res = await request(app).get(`/v1/lists/${uuid()}`).set(token);
        expect(res.statusCode).toEqual(404);
    });

    it("should not return a list the user doesn't have access to", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [listOwner] = await CreateUsers(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: listOwner!.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .get(`/v1/lists/${lists[0]!.listId}`)
            .set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should return correct list details", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        const res = await request(app)
            .get(`/v1/lists/${list.listId}`)
            .set(token);

        expect(res.statusCode).toEqual(200);

        const data = res.body as components["schemas"]["List"];

        expect(data.listId).toEqual(list.listId);
        expect(data.name).toEqual(list.name);
        expect(data.description).toEqual(list.description);
        expect(data.owner.userId).toEqual(user.userId);
        expect(data.status).toEqual("O");
    });

    it("should return the list for allowed member statuses (A, M)", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [listOwner] = await CreateUsers(database);

        const statuses = ["A", "M"] as const;

        for (const status of statuses) {
            const {
                lists: [list],
            } = await KnexListRepository.create(database, {
                userId: listOwner!.userId,
                lists: [{ name: uuid(), description: uuid() }],
            });

            await KnexListRepository.saveMembers(database, {
                listId: list!.listId,
                members: [{ userId: user.userId, status }],
            });

            const res = await request(app)
                .get(`/v1/lists/${list!.listId}`)
                .set(token);

            expect(res.statusCode).toEqual(200);

            const data = res.body as components["schemas"]["List"];
            expect(data?.listId).toEqual(list!.listId);
            expect(data?.status).toEqual(status);
        }
    });

    it("should return 404 for disallowed member statuses (P, B)", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [listOwner] = await CreateUsers(database);

        const statuses = ["P", "B"] as const;

        for (const status of statuses) {
            const {
                lists: [list],
            } = await KnexListRepository.create(database, {
                userId: listOwner!.userId,
                lists: [{ name: uuid(), description: uuid() }],
            });

            await KnexListRepository.saveMembers(database, {
                listId: list!.listId,
                members: [{ userId: user.userId, status }],
            });

            const res = await request(app)
                .get(`/v1/lists/${list!.listId}`)
                .set(token);

            expect(res.statusCode).toEqual(404);
        }
    });
});

describe("Update a list", () => {
    it("should require authentication", async () => {
        const res = await request(app).patch(`/v1/lists/${uuid()}`);
        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent list", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const res = await request(app)
            .patch(`/v1/lists/${uuid()}`)
            .set(token)
            .send({ name: uuid() });
        expect(res.statusCode).toEqual(404);
    });

    it("should not allow update if the user is not the list owner (A, M, P, B)", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [owner] = await CreateUsers(database);

        const statuses = ["A", "M", "P", "B"] as const;

        for (const status of statuses) {
            const { lists } = await KnexListRepository.create(database, {
                userId: owner!.userId,
                lists: [{ name: uuid(), description: uuid() }],
            });
            const list = lists[0]!;

            await KnexListRepository.saveMembers(database, {
                listId: list.listId,
                members: [{ userId: user.userId, status }],
            });

            const res = await request(app)
                .patch(`/v1/lists/${list.listId}`)
                .set(token)
                .send({ name: uuid() });
            expect(res.statusCode).toEqual(404);
        }
    });

    it("should save updated list details when the user is the list owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        const updatedList = {
            name: uuid(),
            description: uuid(),
            icon: randomIcon(),
        } satisfies components["schemas"]["ListUpdate"];

        const res = await request(app)
            .patch(`/v1/lists/${list.listId}`)
            .set(token)
            .send(updatedList);

        expect(res.statusCode).toEqual(200);

        const {
            lists: [savedList],
        } = await KnexListRepository.read(database, {
            lists: [list],
            userId: user.userId,
        });

        expect(savedList?.name).toEqual(updatedList.name);
        expect(savedList?.description).toEqual(updatedList.description);
        expect(savedList?.icon).toEqual(updatedList.icon);
    });

    it("should fail if the request contains extraneous properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;

        const res = await request(app)
            .patch(`/v1/lists/${list.listId}`)
            .set(token)
            .send({
                name: uuid(),
                extra: "invalid",
            });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if the request contains invalid properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;

        const res = await request(app)
            .patch(`/v1/lists/${list.listId}`)
            .set(token)
            .send({ name: 12345 });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if a required field is set to null", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;
        const res = await request(app)
            .patch(`/v1/lists/${list.listId}`)
            .set(token)
            .send({ name: null });
        expect(res.statusCode).toEqual(400);
    });
});

describe("Delete a list", () => {
    it("should require authentication", async () => {
        const res = await request(app).delete(`/v1/lists/${uuid()}`);
        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent list", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const res = await request(app)
            .delete(`/v1/lists/${uuid()}`)
            .set(token)
            .send();
        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if the user is not the list owner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [owner] = await CreateUsers(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: owner!.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        const res = await request(app)
            .delete(`/v1/lists/${list.listId}`)
            .set(token)
            .send();
        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if the user is a list member but not the owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [owner] = await CreateUsers(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: owner!.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        await KnexListRepository.saveMembers(database, {
            listId: list.listId,
            members: [{ userId: user.userId, status: "A" }],
        });

        const res = await request(app)
            .delete(`/v1/lists/${list.listId}`)
            .set(token)
            .send();
        expect(res.statusCode).toEqual(404);
    });

    it("should successfully delete the list", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        const res = await request(app)
            .delete(`/v1/lists/${list.listId}`)
            .set(token)
            .send();
        expect(res.statusCode).toEqual(204);

        const { lists: savedLists } = await KnexListRepository.read(database, {
            lists: [list],
            userId: user.userId,
        });
        expect(savedLists.length).toEqual(0);
    });
});

describe("Get list items", () => {
    it("should require authentication", async () => {
        const res = await request(app).get(`/v1/lists/${uuid()}/items`);
        expect(res.statusCode).toEqual(401);
    });

    it("should return list items", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        const { items } = await KnexListRepository.createItems(database, {
            userId: user.userId,
            listId: list.listId,
            items: [{ name: uuid() }, { name: uuid() }],
        });

        const res = await request(app)
            .get(`/v1/lists/${list.listId}/items`)
            .set(token);

        expect(res.statusCode).toEqual(200);

        const listItemData = res.body as components["schemas"]["ListItem"][];

        expect(listItemData.length).toEqual(2);
        expect(listItemData.map((i) => i.itemId)).toContain(items[0]!.itemId);
        expect(listItemData.map((i) => i.itemId)).toContain(items[1]!.itemId);
    });

    it("should return list items for allowed member statuses (A, M)", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [listOwner] = await CreateUsers(database);

        const statuses = ["A", "M"] as const;

        for (const status of statuses) {
            const {
                lists: [list],
            } = await KnexListRepository.create(database, {
                userId: listOwner!.userId,
                lists: [{ name: uuid(), description: uuid() }],
            });

            await KnexListRepository.saveMembers(database, {
                listId: list!.listId,
                members: [{ userId: user.userId, status }],
            });

            const { items } = await KnexListRepository.createItems(database, {
                userId: listOwner!.userId,
                listId: list!.listId,
                items: [{ name: uuid() }],
            });

            const res = await request(app)
                .get(`/v1/lists/${list!.listId}/items`)
                .set(token);

            expect(res.statusCode).toEqual(200);
            const listItemData =
                res.body as components["schemas"]["ListItem"][];
            expect(listItemData).toHaveLength(1);
            expect(listItemData[0]!.itemId).toEqual(items[0]!.itemId);
        }
    });

    it("should return 404 for list items if the user is blacklisted or pending", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [listOwner] = await CreateUsers(database);

        const statuses = ["P", "B"] as const;

        for (const status of statuses) {
            const {
                lists: [list],
            } = await KnexListRepository.create(database, {
                userId: listOwner!.userId,
                lists: [{ name: uuid(), description: uuid() }],
            });

            await KnexListRepository.saveMembers(database, {
                listId: list!.listId,
                members: [{ userId: user.userId, status }],
            });

            const res = await request(app)
                .get(`/v1/lists/${list!.listId}/items`)
                .set(token);

            expect(res.statusCode).toEqual(404);
        }
    });
});

describe("Add item to list", () => {
    it("should require authentication", async () => {
        const res = await request(app).post(`/v1/lists/${uuid()}/items`);
        expect(res.statusCode).toEqual(401);
    });

    it("should create a list item", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        const itemData = {
            name: uuid(),
            completed: false,
            notes: uuid(),
        } satisfies components["schemas"]["ListItemCreate"];

        const res = await request(app)
            .post(`/v1/lists/${list.listId}/items`)
            .set(token)
            .send(itemData);

        expect(res.statusCode).toEqual(201);
        const [returnedItem] = res.body as components["schemas"]["ListItem"][];

        expect(returnedItem!.name).toEqual(itemData.name);
        expect(returnedItem!.notes).toEqual(itemData.notes);
    });

    // it("should create a list item with ingredient", async () => {
    //     const [token, user] = await PrepareAuthenticatedUser(database);

    //     const { lists } = await KnexListRepository.create(database, {
    //         userId: user.userId,
    //         lists: [{ name: uuid(), description: uuid() }],
    //     });
    //     const list = lists[0]!;

    //     const [ingredients] = await CreateIngredients(database, { createdBy: user.userId, count: 1 });
    //     const ingredient = ingredients[0]!;

    //     const itemData = {
    //         name: uuid(),
    //         ingredientId: ingredient.ingredientId,
    //     } satisfies components["schemas"]["ListItemCreate"];

    //     const res = await request(app).post(`/v1/lists/${list.listId}/items`).set(token).send(itemData);

    //     expect(res.statusCode).toEqual(201);
    //     const [returnedItem] = res.body as components["schemas"]["ListItem"][];

    //     expect(returnedItem!.ingredientId).toEqual(ingredient.ingredientId);
    // });

    it("should allow adding an item if the user is a list administrator", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [listOwner] = await CreateUsers(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: listOwner!.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        await KnexListRepository.saveMembers(database, {
            listId: list.listId,
            members: [{ userId: user.userId, status: "A" }],
        });

        const itemData = {
            name: uuid(),
        } satisfies components["schemas"]["ListItemCreate"];

        const res = await request(app)
            .post(`/v1/lists/${list.listId}/items`)
            .set(token)
            .send(itemData);

        expect(res.statusCode).toEqual(201);
        const [returnedItem] = res.body as components["schemas"]["ListItem"][];

        expect(returnedItem!.name).toEqual(itemData.name);
    });

    it("should not allow adding an item if the user is a list member, pending, or blacklisted", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [listOwner] = await CreateUsers(database);

        const statuses = ["M", "P", "B"] as const;

        for (const status of statuses) {
            const { lists } = await KnexListRepository.create(database, {
                userId: listOwner!.userId,
                lists: [{ name: uuid(), description: uuid() }],
            });
            const list = lists[0]!;

            await KnexListRepository.saveMembers(database, {
                listId: list.listId,
                members: [{ userId: user.userId, status }],
            });

            const itemData = {
                name: uuid(),
            } satisfies components["schemas"]["ListItemCreate"];

            const res = await request(app)
                .post(`/v1/lists/${list.listId}/items`)
                .set(token)
                .send(itemData);

            expect(res.statusCode).toEqual(404);
        }
    });

    it("should fail if the request contains extraneous properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;

        const res = await request(app)
            .post(`/v1/lists/${list.listId}/items`)
            .set(token)
            .send({
                name: uuid(),
                extra: "invalid",
            });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if the request contains invalid properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;

        const res = await request(app)
            .post(`/v1/lists/${list.listId}/items`)
            .set(token)
            .send({
                name: 12345,
            });
        expect(res.statusCode).toEqual(400);
    });
});

describe("Update list item", () => {
    it("should require authentication", async () => {
        const res = await request(app).patch(
            `/v1/lists/${uuid()}/items/${uuid()}`,
        );
        expect(res.statusCode).toEqual(401);
    });

    it("should update a list item", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        const { items } = await KnexListRepository.createItems(database, {
            userId: user.userId,
            listId: list.listId,
            items: [{ name: uuid() }],
        });
        const item = items[0]!;

        const updateData = {
            name: uuid(),
            completed: true,
        } satisfies components["schemas"]["ListItemUpdate"];

        const res = await request(app)
            .patch(`/v1/lists/${list.listId}/items/${item.itemId}`)
            .set(token)
            .send(updateData);

        expect(res.statusCode).toEqual(200);
        const returnedItem = res.body as components["schemas"]["ListItem"];

        expect(returnedItem.name).toEqual(updateData.name);
        expect(returnedItem.completed).toEqual(true);
    });

    it("should allow updating an item if the user is a list administrator", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [listOwner] = await CreateUsers(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: listOwner!.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        await KnexListRepository.saveMembers(database, {
            listId: list.listId,
            members: [{ userId: user.userId, status: "A" }],
        });

        const { items } = await KnexListRepository.createItems(database, {
            userId: listOwner!.userId,
            listId: list.listId,
            items: [{ name: uuid() }],
        });
        const item = items[0]!;

        const updateData = {
            name: uuid(),
        } satisfies components["schemas"]["ListItemUpdate"];

        const res = await request(app)
            .patch(`/v1/lists/${list.listId}/items/${item.itemId}`)
            .set(token)
            .send(updateData);

        expect(res.statusCode).toEqual(200);
        const returnedItem = res.body as components["schemas"]["ListItem"];

        expect(returnedItem.name).toEqual(updateData.name);
    });

    it("should not allow updating an item if the user is a list member, pending, or blacklisted", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [listOwner] = await CreateUsers(database);

        const statuses = ["M", "P", "B"] as const;

        for (const status of statuses) {
            const { lists } = await KnexListRepository.create(database, {
                userId: listOwner!.userId,
                lists: [{ name: uuid(), description: uuid() }],
            });
            const list = lists[0]!;

            await KnexListRepository.saveMembers(database, {
                listId: list.listId,
                members: [{ userId: user.userId, status }],
            });

            const { items } = await KnexListRepository.createItems(database, {
                userId: listOwner!.userId,
                listId: list.listId,
                items: [{ name: uuid() }],
            });
            const item = items[0]!;

            const updateData = {
                name: uuid(),
            } satisfies components["schemas"]["ListItemUpdate"];

            const res = await request(app)
                .patch(`/v1/lists/${list.listId}/items/${item.itemId}`)
                .set(token)
                .send(updateData);

            expect(res.statusCode).toEqual(404);
        }
    });

    it("should not allow updating an item that belongs to another list", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }, { name: uuid() }],
        });
        const [list1, list2] = lists;

        const { items } = await KnexListRepository.createItems(database, {
            userId: user.userId,
            listId: list2!.listId,
            items: [{ name: uuid() }],
        });
        const itemOnList2 = items[0]!;

        const updateData = {
            name: uuid(),
        } satisfies components["schemas"]["ListItemUpdate"];

        const res = await request(app)
            .patch(`/v1/lists/${list1!.listId}/items/${itemOnList2.itemId}`)
            .set(token)
            .send(updateData);

        expect(res.statusCode).toEqual(404);
    });

    it("should fail if the request contains extraneous properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;

        const { items } = await KnexListRepository.createItems(database, {
            userId: user.userId,
            listId: list.listId,
            items: [{ name: uuid() }],
        });
        const item = items[0]!;

        const res = await request(app)
            .patch(`/v1/lists/${list.listId}/items/${item.itemId}`)
            .set(token)
            .send({
                name: uuid(),
                extra: "invalid",
            });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if the request contains invalid properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;

        const { items } = await KnexListRepository.createItems(database, {
            userId: user.userId,
            listId: list.listId,
            items: [{ name: uuid() }],
        });
        const item = items[0]!;

        const res = await request(app)
            .patch(`/v1/lists/${list.listId}/items/${item.itemId}`)
            .set(token)
            .send({
                name: 12345,
            });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if a required field is set to null", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;
        const { items } = await KnexListRepository.createItems(database, {
            userId: user.userId,
            listId: list.listId,
            items: [{ name: uuid() }],
        });
        const item = items[0]!;

        const res = await request(app)
            .patch(`/v1/lists/${list.listId}/items/${item.itemId}`)
            .set(token)
            .send({
                name: null,
            });
        expect(res.statusCode).toEqual(400);
    });
});

describe("Delete list item", () => {
    it("should require authentication", async () => {
        const res = await request(app).delete(
            `/v1/lists/${uuid()}/items/${uuid()}`,
        );
        expect(res.statusCode).toEqual(401);
    });

    it("should delete a list item", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        const { items } = await KnexListRepository.createItems(database, {
            userId: user.userId,
            listId: list.listId,
            items: [{ name: uuid() }],
        });
        const item = items[0]!;

        const res = await request(app)
            .delete(`/v1/lists/${list.listId}/items/${item.itemId}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(204);

        const { items: remainingItems } = await KnexListRepository.readAllItems(
            database,
            {
                userId: user.userId,
                filter: { listId: list.listId },
            },
        );
        expect(remainingItems.length).toEqual(0);
    });

    it("should allow deleting an item if the user is a list administrator", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [listOwner] = await CreateUsers(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: listOwner!.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        await KnexListRepository.saveMembers(database, {
            listId: list.listId,
            members: [{ userId: user.userId, status: "A" }],
        });

        const { items } = await KnexListRepository.createItems(database, {
            userId: listOwner!.userId,
            listId: list.listId,
            items: [{ name: uuid() }],
        });
        const item = items[0]!;

        const res = await request(app)
            .delete(`/v1/lists/${list.listId}/items/${item.itemId}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(204);

        const { items: remainingItems } = await KnexListRepository.readAllItems(
            database,
            {
                userId: listOwner!.userId,
                filter: { listId: list.listId },
            },
        );
        expect(remainingItems.length).toEqual(0);
    });

    it("should not allow deleting an item if the user is a list member, pending, or blacklisted", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [listOwner] = await CreateUsers(database);

        const statuses = ["M", "P", "B"] as const;

        for (const status of statuses) {
            const { lists } = await KnexListRepository.create(database, {
                userId: listOwner!.userId,
                lists: [{ name: uuid(), description: uuid() }],
            });
            const list = lists[0]!;

            await KnexListRepository.saveMembers(database, {
                listId: list.listId,
                members: [{ userId: user.userId, status }],
            });

            const { items } = await KnexListRepository.createItems(database, {
                userId: listOwner!.userId,
                listId: list.listId,
                items: [{ name: uuid() }],
            });
            const item = items[0]!;

            const res = await request(app)
                .delete(`/v1/lists/${list.listId}/items/${item.itemId}`)
                .set(token)
                .send();

            expect(res.statusCode).toEqual(404);
        }
    });

    it("should not allow deleting an item that belongs to another list", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }, { name: uuid() }],
        });
        const [list1, list2] = lists;

        const { items } = await KnexListRepository.createItems(database, {
            userId: user.userId,
            listId: list2!.listId,
            items: [{ name: uuid() }],
        });
        const itemOnList2 = items[0]!;

        const res = await request(app)
            .delete(`/v1/lists/${list1!.listId}/items/${itemOnList2.itemId}`)
            .set(token)
            .send();

        expect(res.statusCode).toEqual(404);
    });
});

describe("Get list members", () => {
    it("should require authentication", async () => {
        const res = await request(app).get(`/v1/lists/${uuid()}/members`);
        expect(res.statusCode).toEqual(401);
    });

    it("should return list members", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        await KnexListRepository.saveMembers(database, {
            listId: list.listId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const res = await request(app)
            .get(`/v1/lists/${list.listId}/members`)
            .set(token);

        expect(res.statusCode).toEqual(200);
        const members = res.body as components["schemas"]["Member"][];
        expect(members).toHaveLength(1);
        expect(members[0]!.userId).toEqual(member!.userId);
    });

    it("should return 404 for the member list if the user is not the owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [listOwner] = await CreateUsers(database);

        const statuses = ["A", "M", "P", "B"] as const;

        for (const status of statuses) {
            const { lists } = await KnexListRepository.create(database, {
                userId: listOwner!.userId,
                lists: [{ name: uuid(), description: uuid() }],
            });
            const list = lists[0]!;

            await KnexListRepository.saveMembers(database, {
                listId: list.listId,
                members: [{ userId: user.userId, status }],
            });

            const res = await request(app)
                .get(`/v1/lists/${list.listId}/members`)
                .set(token);

            expect(res.statusCode).toEqual(404);
        }
    });
});

describe("Invite member to list", () => {
    it("should require authentication", async () => {
        const res = await request(app).post(`/v1/lists/${uuid()}/members`);
        expect(res.statusCode).toEqual(401);
    });

    it("should invite a member", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [invitee] = await CreateUsers(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        const res = await request(app)
            .post(`/v1/lists/${list.listId}/members`)
            .set(token)
            .send({ userId: invitee!.userId });

        expect(res.statusCode).toEqual(204);

        const [members] = await KnexListRepository.readMembers(database, {
            listId: list.listId,
        });
        expect(members!.members).toHaveLength(1);
        expect(members!.members[0]!.status).toEqual("P");
    });

    it("should return 400 if the user is already a member", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;

        await KnexListRepository.saveMembers(database, {
            listId: list.listId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const res = await request(app)
            .post(`/v1/lists/${list.listId}/members`)
            .set(token)
            .send({ userId: member!.userId });

        expect(res.statusCode).toEqual(400);
    });

    it("should return 404 for an invite if the user is not the owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [listOwner] = await CreateUsers(database);
        const [invitee] = await CreateUsers(database);

        const statuses = ["A", "M", "P", "B"] as const;

        for (const status of statuses) {
            const { lists } = await KnexListRepository.create(database, {
                userId: listOwner!.userId,
                lists: [{ name: uuid(), description: uuid() }],
            });
            const list = lists[0]!;

            await KnexListRepository.saveMembers(database, {
                listId: list.listId,
                members: [{ userId: user.userId, status }],
            });

            const res = await request(app)
                .post(`/v1/lists/${list.listId}/members`)
                .set(token)
                .send({ userId: invitee!.userId });

            expect(res.statusCode).toEqual(404);
        }
    });

    it("should return 404 if the user does not exist", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;

        const res = await request(app)
            .post(`/v1/lists/${list.listId}/members`)
            .set(token)
            .send({ userId: uuid() });
        expect(res.statusCode).toEqual(404);
    });

    it("should fail if the request contains extraneous properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;

        const res = await request(app)
            .post(`/v1/lists/${list.listId}/members`)
            .set(token)
            .send({ userId: uuid(), extra: "invalid" });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if the request contains invalid properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;

        const res = await request(app)
            .post(`/v1/lists/${list.listId}/members`)
            .set(token)
            .send({ userId: 12345 });
        expect(res.statusCode).toEqual(400);
    });
});

describe("Update list member", () => {
    it("should require authentication", async () => {
        const res = await request(app).patch(
            `/v1/lists/${uuid()}/members/${uuid()}`,
        );
        expect(res.statusCode).toEqual(401);
    });

    it("should update member status", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        await KnexListRepository.saveMembers(database, {
            listId: list.listId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const res = await request(app)
            .patch(`/v1/lists/${list.listId}/members/${member!.userId}`)
            .set(token)
            .send({ status: "A" });

        expect(res.statusCode).toEqual(200);
        const updatedMember = res.body as components["schemas"]["Member"];
        expect(updatedMember.status).toEqual("A");
    });

    it("should not allow non-owners (A, M, P, B) to update a member status", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [owner] = await CreateUsers(database);
        const [member] = await CreateUsers(database);

        const statuses = ["A", "M", "P", "B"] as const;

        for (const status of statuses) {
            const { lists } = await KnexListRepository.create(database, {
                userId: owner!.userId,
                lists: [{ name: uuid(), description: uuid() }],
            });
            const list = lists[0]!;

            await KnexListRepository.saveMembers(database, [
                {
                    listId: list.listId,
                    members: [
                        { userId: user.userId, status },
                        { userId: member!.userId, status: "M" },
                    ],
                },
            ]);

            const res = await request(app)
                .patch(`/v1/lists/${list.listId}/members/${member!.userId}`)
                .set(token)
                .send({ status: "A" });

            expect(res.statusCode).toEqual(404);
        }
    });

    it("should fail when trying to update a member to restricted statuses (O, P)", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;

        await KnexListRepository.saveMembers(database, {
            listId: list.listId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const restrictedStatuses = ["O", "P"];

        for (const status of restrictedStatuses) {
            const res = await request(app)
                .patch(`/v1/lists/${list.listId}/members/${member!.userId}`)
                .set(token)
                .send({ status });

            expect(res.statusCode).toEqual(400);
        }
    });

    it("should return 400 when trying to update a pending member", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;

        await KnexListRepository.saveMembers(database, {
            listId: list.listId,
            members: [{ userId: member!.userId, status: "P" }],
        });

        const res = await request(app)
            .patch(`/v1/lists/${list.listId}/members/${member!.userId}`)
            .set(token)
            .send({ status: "M" });

        expect(res.statusCode).toEqual(400);
    });

    it("should fail if the request contains extraneous properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);
        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;
        await KnexListRepository.saveMembers(database, {
            listId: list.listId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const res = await request(app)
            .patch(`/v1/lists/${list.listId}/members/${member!.userId}`)
            .set(token)
            .send({ status: "A", extra: "invalid" });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if the request contains invalid properties", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);
        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;
        await KnexListRepository.saveMembers(database, {
            listId: list.listId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const res = await request(app)
            .patch(`/v1/lists/${list.listId}/members/${member!.userId}`)
            .set(token)
            .send({ status: "INVALID" });
        expect(res.statusCode).toEqual(400);
    });

    it("should fail if a required field is set to null", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);
        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;
        await KnexListRepository.saveMembers(database, {
            listId: list.listId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const res = await request(app)
            .patch(`/v1/lists/${list.listId}/members/${member!.userId}`)
            .set(token)
            .send({ status: null });
        expect(res.statusCode).toEqual(400);
    });
});

describe("Remove member from list", () => {
    it("should require authentication", async () => {
        const res = await request(app).delete(
            `/v1/lists/${uuid()}/members/${uuid()}`,
        );
        expect(res.statusCode).toEqual(401);
    });

    it("should remove a member", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [member] = await CreateUsers(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        await KnexListRepository.saveMembers(database, {
            listId: list.listId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const res = await request(app)
            .delete(`/v1/lists/${list.listId}/members/${member!.userId}`)
            .set(token);

        expect(res.statusCode).toEqual(204);

        const [members] = await KnexListRepository.readMembers(database, {
            listId: list.listId,
        });
        expect(members!.members).toHaveLength(0);
    });

    it("should not allow non-owners (A, M, P, B) to remove a member", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [owner] = await CreateUsers(database);
        const [member] = await CreateUsers(database);

        const statuses = ["A", "M", "P", "B"] as const;

        for (const status of statuses) {
            const { lists } = await KnexListRepository.create(database, {
                userId: owner!.userId,
                lists: [{ name: uuid(), description: uuid() }],
            });
            const list = lists[0]!;

            await KnexListRepository.saveMembers(database, [
                {
                    listId: list.listId,
                    members: [
                        { userId: user.userId, status },
                        { userId: member!.userId, status: "M" },
                    ],
                },
            ]);

            const res = await request(app)
                .delete(`/v1/lists/${list.listId}/members/${member!.userId}`)
                .set(token);

            expect(res.statusCode).toEqual(404);
        }
    });
});

describe("Accept list invitation", () => {
    it("should require authentication", async () => {
        const res = await request(app).post(
            `/v1/lists/${uuid()}/invite/accept`,
        );
        expect(res.statusCode).toEqual(401);
    });

    it("should accept invitation", async () => {
        const [owner] = await CreateUsers(database);
        const [token, invitee] = await PrepareAuthenticatedUser(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: owner!.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        await KnexListRepository.saveMembers(database, {
            listId: list.listId,
            members: [{ userId: invitee.userId, status: "P" }],
        });

        const res = await request(app)
            .post(`/v1/lists/${list.listId}/invite/accept`)
            .set(token);

        expect(res.statusCode).toEqual(204);

        const [members] = await KnexListRepository.readMembers(database, {
            listId: list.listId,
        });
        expect(members!.members[0]!.status).toEqual("M");
    });

    it("should return 404 when accepting an invite if the user is already a member (A, M) or blacklisted (B)", async () => {
        const [inviteeToken, invitee] =
            await PrepareAuthenticatedUser(database);
        const [owner] = await CreateUsers(database);

        const statuses = ["A", "M", "B"] as const;

        for (const status of statuses) {
            const { lists } = await KnexListRepository.create(database, {
                userId: owner!.userId,
                lists: [{ name: uuid() }],
            });
            const list = lists[0]!;

            await KnexListRepository.saveMembers(database, {
                listId: list.listId,
                members: [{ userId: invitee.userId, status }],
            });

            const res = await request(app)
                .post(`/v1/lists/${list.listId}/invite/accept`)
                .set(inviteeToken);

            expect(res.statusCode).toEqual(404);
        }
    });
});

describe("Decline list invitation", () => {
    it("should require authentication", async () => {
        const res = await request(app).post(
            `/v1/lists/${uuid()}/invite/decline`,
        );
        expect(res.statusCode).toEqual(401);
    });

    it("should decline invitation", async () => {
        const [owner] = await CreateUsers(database);
        const [token, invitee] = await PrepareAuthenticatedUser(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: owner!.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        await KnexListRepository.saveMembers(database, {
            listId: list.listId,
            members: [{ userId: invitee.userId, status: "P" }],
        });

        const res = await request(app)
            .post(`/v1/lists/${list.listId}/invite/decline`)
            .set(token);

        expect(res.statusCode).toEqual(204);

        const [members] = await KnexListRepository.readMembers(database, {
            listId: list.listId,
        });
        expect(members!.members).toHaveLength(0);
    });

    it("should return 404 when declining an invite if the user is already a member (A, M) or blacklisted (B)", async () => {
        const [inviteeToken, invitee] =
            await PrepareAuthenticatedUser(database);
        const [owner] = await CreateUsers(database);

        const statuses = ["A", "M", "B"] as const;

        for (const status of statuses) {
            const { lists } = await KnexListRepository.create(database, {
                userId: owner!.userId,
                lists: [{ name: uuid() }],
            });
            const list = lists[0]!;

            await KnexListRepository.saveMembers(database, {
                listId: list.listId,
                members: [{ userId: invitee.userId, status }],
            });

            const res = await request(app)
                .post(`/v1/lists/${list.listId}/invite/decline`)
                .set(inviteeToken);

            expect(res.statusCode).toEqual(404);
        }
    });
});

describe("Leave list", () => {
    it("should require authentication", async () => {
        const res = await request(app).post(`/v1/lists/${uuid()}/leave`);
        expect(res.statusCode).toEqual(401);
    });

    it("should leave list", async () => {
        const [owner] = await CreateUsers(database);
        const [token, member] = await PrepareAuthenticatedUser(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: owner!.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        await KnexListRepository.saveMembers(database, {
            listId: list.listId,
            members: [{ userId: member.userId, status: "M" }],
        });

        const res = await request(app)
            .post(`/v1/lists/${list.listId}/leave`)
            .set(token);

        expect(res.statusCode).toEqual(204);

        const [members] = await KnexListRepository.readMembers(database, {
            listId: list.listId,
        });
        expect(members!.members).toHaveLength(0);
    });

    it("should return 404 if the owner tries to leave the list", async () => {
        const [ownerToken, owner] = await PrepareAuthenticatedUser(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: owner.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        const res = await request(app)
            .post(`/v1/lists/${list.listId}/leave`)
            .set(ownerToken);

        expect(res.statusCode).toEqual(404);
    });

    it("should return 404 if a pending or blacklisted user tries to leave the list", async () => {
        const [_ownerToken, owner] = await PrepareAuthenticatedUser(database);
        const [userToken, user] = await PrepareAuthenticatedUser(database);

        const statuses = ["P", "B"] as const;

        for (const status of statuses) {
            const { lists } = await KnexListRepository.create(database, {
                userId: owner.userId,
                lists: [{ name: uuid() }],
            });
            const list = lists[0]!;

            await KnexListRepository.saveMembers(database, {
                listId: list.listId,
                members: [{ userId: user.userId, status }],
            });

            const res = await request(app)
                .post(`/v1/lists/${list.listId}/leave`)
                .set(userToken);

            expect(res.statusCode).toEqual(404);
        }
    });
});

describe("Move list items to another list", () => {
    it("should require authentication", async () => {
        const res = await request(app).post(`/v1/lists/${uuid()}/items/move`);
        expect(res.statusCode).toEqual(401);
    });

    it("should move items to another list", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }, { name: uuid() }],
        });
        const [sourceList, destList] = lists;

        const { items } = await KnexListRepository.createItems(database, {
            userId: user.userId,
            listId: sourceList!.listId,
            items: [{ name: uuid(), notes: "test notes" }],
        });
        const item = items[0]!;

        const res = await request(app)
            .post(`/v1/lists/${sourceList!.listId}/items/move`)
            .set(token)
            .send({
                destinationListId: destList!.listId,
                itemIds: [item.itemId],
            });

        expect(res.statusCode).toEqual(200);
        const [movedItem] = res.body as components["schemas"]["ListItem"][];
        expect(movedItem).toBeDefined();
        expect(movedItem!.itemId).toEqual(item.itemId);
        expect(movedItem!.name).toEqual(item.name);
        expect(movedItem!.notes).toEqual("test notes");

        // Verify removed from source
        const { items: sourceItems } = await KnexListRepository.readAllItems(
            database,
            {
                userId: user.userId,
                filter: { listId: sourceList!.listId },
            },
        );
        expect(sourceItems).toHaveLength(0);

        // Verify added to destination
        const { items: destItems } = await KnexListRepository.readAllItems(
            database,
            {
                userId: user.userId,
                filter: { listId: destList!.listId },
            },
        );
        expect(destItems).toHaveLength(1);
        expect(destItems[0]!.itemId).toEqual(item.itemId);
        expect(destItems[0]!.listId).toEqual(destList!.listId);
    });

    it("should fail if moving to the same list", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;
        const { items } = await KnexListRepository.createItems(database, {
            userId: user.userId,
            listId: list.listId,
            items: [{ name: uuid() }],
        });
        const item = items[0]!;

        const res = await request(app)
            .post(`/v1/lists/${list.listId}/items/move`)
            .set(token)
            .send({ destinationListId: list.listId, itemIds: [item.itemId] });

        expect(res.statusCode).toEqual(400);
    });

    it("should fail if user does not have access to destination list", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database);

        const { lists: sourceLists } = await KnexListRepository.create(
            database,
            {
                userId: user.userId,
                lists: [{ name: uuid() }],
            },
        );
        const { lists: destLists } = await KnexListRepository.create(database, {
            userId: otherUser!.userId,
            lists: [{ name: uuid() }],
        });

        const sourceList = sourceLists[0]!;
        const destList = destLists[0]!;

        const { items } = await KnexListRepository.createItems(database, {
            userId: user.userId,
            listId: sourceList.listId,
            items: [{ name: uuid() }],
        });
        const item = items[0]!;

        const res = await request(app)
            .post(`/v1/lists/${sourceList.listId}/items/move`)
            .set(token)
            .send({
                destinationListId: destList.listId,
                itemIds: [item.itemId],
            });

        expect(res.statusCode).toEqual(404);
    });

    it("should fail if item does not exist in source list", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const { lists } = await KnexListRepository.create(database, {
            userId: user.userId,
            lists: [{ name: uuid() }, { name: uuid() }],
        });
        const [sourceList, destList] = lists;

        const res = await request(app)
            .post(`/v1/lists/${sourceList!.listId}/items/move`)
            .set(token)
            .send({ destinationListId: destList!.listId, itemIds: [uuid()] });

        expect(res.statusCode).toEqual(404);
    });
});
