import { afterEach, beforeEach, describe } from "node:test";
import { expect } from "expect";
import request from "supertest";
import { v4 as uuid } from "uuid";
import type { components } from "../../src/routes/spec/index.ts";
import { CreateUsers, PrepareAuthenticatedUser } from "../helpers/index.ts";
import {
    beginTestTransaction,
    createTestApp,
    rollbackTestTransaction,
    TestContext,
    withCxIt,
} from "../helpers/setup.ts";

const randomIcon = () =>
    (["variant1", "variant2", "variant3"] as const)[
        Math.floor(Math.random() * 3)
    ];

let { app, listRepository, userRepository } = TestContext;

beforeEach(async () => {
    await beginTestTransaction();
    ({ app, listRepository, userRepository } = createTestApp({}));
});

afterEach(async () => {
    await rollbackTestTransaction();
});

describe("Get user lists", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).get("/v1/lists");
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should return all lists created by the user", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const { lists } = await listRepository.create({
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

    withCxIt("should return lists a user is a member of", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);
        const [otherUser] = await CreateUsers(userRepository);

        const { lists } = await listRepository.create({
            userId: otherUser!.userId,
            lists: [{ name: uuid() }, { name: uuid() }, { name: uuid() }],
        });
        const [adminList, memberList, pendingList] = lists;

        await listRepository.saveMembers([
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

    withCxIt(
        "should not return lists where the user is blacklisted",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [otherUser] = await CreateUsers(userRepository);

            const { lists } = await listRepository.create({
                userId: otherUser!.userId,
                lists: [{ name: uuid() }],
            });
            const [blockedList] = lists;

            await listRepository.saveMembers([
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
        },
    );

    withCxIt("should not return lists belonging to other users", async () => {
        const [token] = await PrepareAuthenticatedUser(userRepository);
        const [otherUser] = await CreateUsers(userRepository);

        const { lists } = await listRepository.create({
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
    withCxIt("should require authentication", async () => {
        const res = await request(app).post("/v1/lists");
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should successfully create a new list", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

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

        const { lists: savedLists } = await listRepository.readAll({
            userId: user.userId,
        });
        expect(savedLists.length).toEqual(1);

        const [savedList] = savedLists;
        expect(savedList?.name).toEqual(listData.name);
        expect(savedList?.description).toEqual(listData.description);
        expect(savedList?.icon).toEqual(listData.icon);
        expect(savedList?.owner.userId).toEqual(user.userId);
    });

    withCxIt(
        "should fail if the request contains invalid properties",
        async () => {
            const [token] = await PrepareAuthenticatedUser(userRepository);
            const res = await request(app).post("/v1/lists").set(token).send({
                name: 12345,
                description: uuid(),
            });
            expect(res.statusCode).toEqual(400);
        },
    );

    withCxIt(
        "should fail if the request contains extraneous properties",
        async () => {
            const [token] = await PrepareAuthenticatedUser(userRepository);
            const res = await request(app).post("/v1/lists").set(token).send({
                name: uuid(),
                extra: "invalid",
            });
            expect(res.statusCode).toEqual(400);
        },
    );
});

describe("Get a list", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).get(`/v1/lists/${uuid()}`);
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should return 404 for non-existent list", async () => {
        const [token] = await PrepareAuthenticatedUser(userRepository);
        const res = await request(app).get(`/v1/lists/${uuid()}`).set(token);
        expect(res.statusCode).toEqual(404);
    });

    withCxIt(
        "should not return a list the user doesn't have access to",
        async () => {
            const [token] = await PrepareAuthenticatedUser(userRepository);
            const [listOwner] = await CreateUsers(userRepository);

            const { lists } = await listRepository.create({
                userId: listOwner!.userId,
                lists: [{ name: uuid(), description: uuid() }],
            });

            const res = await request(app)
                .get(`/v1/lists/${lists[0]!.listId}`)
                .set(token);

            expect(res.statusCode).toEqual(404);
        },
    );

    withCxIt("should return correct list details", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const { lists } = await listRepository.create({
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

    withCxIt(
        "should return the list for allowed member statuses (A, M)",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [listOwner] = await CreateUsers(userRepository);

            const statuses = ["A", "M"] as const;

            for (const status of statuses) {
                const {
                    lists: [list],
                } = await listRepository.create({
                    userId: listOwner!.userId,
                    lists: [{ name: uuid(), description: uuid() }],
                });

                await listRepository.saveMembers({
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
        },
    );

    withCxIt(
        "should return 404 for disallowed member statuses (P, B)",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [listOwner] = await CreateUsers(userRepository);

            const statuses = ["P", "B"] as const;

            for (const status of statuses) {
                const {
                    lists: [list],
                } = await listRepository.create({
                    userId: listOwner!.userId,
                    lists: [{ name: uuid(), description: uuid() }],
                });

                await listRepository.saveMembers({
                    listId: list!.listId,
                    members: [{ userId: user.userId, status }],
                });

                const res = await request(app)
                    .get(`/v1/lists/${list!.listId}`)
                    .set(token);

                expect(res.statusCode).toEqual(404);
            }
        },
    );
});

describe("Update a list", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).patch(`/v1/lists/${uuid()}`);
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should return 404 for non-existent list", async () => {
        const [token] = await PrepareAuthenticatedUser(userRepository);
        const res = await request(app)
            .patch(`/v1/lists/${uuid()}`)
            .set(token)
            .send({ name: uuid() });
        expect(res.statusCode).toEqual(404);
    });

    withCxIt(
        "should not allow update if the user is not the list owner (A, M, P, B)",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [owner] = await CreateUsers(userRepository);

            const statuses = ["A", "M", "P", "B"] as const;

            for (const status of statuses) {
                const { lists } = await listRepository.create({
                    userId: owner!.userId,
                    lists: [{ name: uuid(), description: uuid() }],
                });
                const list = lists[0]!;

                await listRepository.saveMembers({
                    listId: list.listId,
                    members: [{ userId: user.userId, status }],
                });

                const res = await request(app)
                    .patch(`/v1/lists/${list.listId}`)
                    .set(token)
                    .send({ name: uuid() });
                expect(res.statusCode).toEqual(404);
            }
        },
    );

    withCxIt(
        "should save updated list details when the user is the list owner",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);

            const { lists } = await listRepository.create({
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
            } = await listRepository.read({
                lists: [list],
                userId: user.userId,
            });

            expect(savedList?.name).toEqual(updatedList.name);
            expect(savedList?.description).toEqual(updatedList.description);
            expect(savedList?.icon).toEqual(updatedList.icon);
        },
    );

    withCxIt(
        "should fail if the request contains extraneous properties",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);

            const { lists } = await listRepository.create({
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
        },
    );

    withCxIt(
        "should fail if the request contains invalid properties",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);

            const { lists } = await listRepository.create({
                userId: user.userId,
                lists: [{ name: uuid() }],
            });
            const list = lists[0]!;

            const res = await request(app)
                .patch(`/v1/lists/${list.listId}`)
                .set(token)
                .send({ name: 12345 });
            expect(res.statusCode).toEqual(400);
        },
    );

    withCxIt("should fail if a required field is set to null", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);
        const { lists } = await listRepository.create({
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
    withCxIt("should require authentication", async () => {
        const res = await request(app).delete(`/v1/lists/${uuid()}`);
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should return 404 for non-existent list", async () => {
        const [token] = await PrepareAuthenticatedUser(userRepository);
        const res = await request(app)
            .delete(`/v1/lists/${uuid()}`)
            .set(token)
            .send();
        expect(res.statusCode).toEqual(404);
    });

    withCxIt(
        "should not allow deletion if the user is not the list owner",
        async () => {
            const [token] = await PrepareAuthenticatedUser(userRepository);
            const [owner] = await CreateUsers(userRepository);

            const { lists } = await listRepository.create({
                userId: owner!.userId,
                lists: [{ name: uuid(), description: uuid() }],
            });
            const list = lists[0]!;

            const res = await request(app)
                .delete(`/v1/lists/${list.listId}`)
                .set(token)
                .send();
            expect(res.statusCode).toEqual(404);
        },
    );

    withCxIt(
        "should not allow deletion if the user is a list member but not the owner",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [owner] = await CreateUsers(userRepository);

            const { lists } = await listRepository.create({
                userId: owner!.userId,
                lists: [{ name: uuid(), description: uuid() }],
            });
            const list = lists[0]!;

            await listRepository.saveMembers({
                listId: list.listId,
                members: [{ userId: user.userId, status: "A" }],
            });

            const res = await request(app)
                .delete(`/v1/lists/${list.listId}`)
                .set(token)
                .send();
            expect(res.statusCode).toEqual(404);
        },
    );

    withCxIt("should successfully delete the list", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const { lists } = await listRepository.create({
            userId: user.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        const res = await request(app)
            .delete(`/v1/lists/${list.listId}`)
            .set(token)
            .send();
        expect(res.statusCode).toEqual(204);

        const { lists: savedLists } = await listRepository.read({
            lists: [list],
            userId: user.userId,
        });
        expect(savedLists.length).toEqual(0);
    });
});

describe("Get list items", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).get(`/v1/lists/${uuid()}/items`);
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should return list items", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const { lists } = await listRepository.create({
            userId: user.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        const { items } = await listRepository.createItems({
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

    withCxIt(
        "should return list items for allowed member statuses (A, M)",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [listOwner] = await CreateUsers(userRepository);

            const statuses = ["A", "M"] as const;

            for (const status of statuses) {
                const {
                    lists: [list],
                } = await listRepository.create({
                    userId: listOwner!.userId,
                    lists: [{ name: uuid(), description: uuid() }],
                });

                await listRepository.saveMembers({
                    listId: list!.listId,
                    members: [{ userId: user.userId, status }],
                });

                const { items } = await listRepository.createItems({
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
        },
    );

    withCxIt(
        "should return 404 for list items if the user is blacklisted or pending",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [listOwner] = await CreateUsers(userRepository);

            const statuses = ["P", "B"] as const;

            for (const status of statuses) {
                const {
                    lists: [list],
                } = await listRepository.create({
                    userId: listOwner!.userId,
                    lists: [{ name: uuid(), description: uuid() }],
                });

                await listRepository.saveMembers({
                    listId: list!.listId,
                    members: [{ userId: user.userId, status }],
                });

                const res = await request(app)
                    .get(`/v1/lists/${list!.listId}/items`)
                    .set(token);

                expect(res.statusCode).toEqual(404);
            }
        },
    );
});

describe("Add item to list", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).post(`/v1/lists/${uuid()}/items`);
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should create a list item", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const { lists } = await listRepository.create({
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

    // withTxIt("should create a list item with ingredient", async () => {
    //     const [token, user] = await PrepareAuthenticatedUser(userRepository);

    //     const { lists } = await listRepository.create({
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

    withCxIt(
        "should allow adding an item if the user is a list administrator",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [listOwner] = await CreateUsers(userRepository);

            const { lists } = await listRepository.create({
                userId: listOwner!.userId,
                lists: [{ name: uuid(), description: uuid() }],
            });
            const list = lists[0]!;

            await listRepository.saveMembers({
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
            const [returnedItem] =
                res.body as components["schemas"]["ListItem"][];

            expect(returnedItem!.name).toEqual(itemData.name);
        },
    );

    withCxIt(
        "should not allow adding an item if the user is a list member, pending, or blacklisted",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [listOwner] = await CreateUsers(userRepository);

            const statuses = ["M", "P", "B"] as const;

            for (const status of statuses) {
                const { lists } = await listRepository.create({
                    userId: listOwner!.userId,
                    lists: [{ name: uuid(), description: uuid() }],
                });
                const list = lists[0]!;

                await listRepository.saveMembers({
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
        },
    );

    withCxIt(
        "should fail if the request contains extraneous properties",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const { lists } = await listRepository.create({
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
        },
    );

    withCxIt(
        "should fail if the request contains invalid properties",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const { lists } = await listRepository.create({
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
        },
    );
});

describe("Update list item", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).patch(
            `/v1/lists/${uuid()}/items/${uuid()}`,
        );
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should update a list item", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const { lists } = await listRepository.create({
            userId: user.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        const { items } = await listRepository.createItems({
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

    withCxIt(
        "should allow updating an item if the user is a list administrator",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [listOwner] = await CreateUsers(userRepository);

            const { lists } = await listRepository.create({
                userId: listOwner!.userId,
                lists: [{ name: uuid(), description: uuid() }],
            });
            const list = lists[0]!;

            await listRepository.saveMembers({
                listId: list.listId,
                members: [{ userId: user.userId, status: "A" }],
            });

            const { items } = await listRepository.createItems({
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
        },
    );

    withCxIt(
        "should not allow updating an item if the user is a list member, pending, or blacklisted",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [listOwner] = await CreateUsers(userRepository);

            const statuses = ["M", "P", "B"] as const;

            for (const status of statuses) {
                const { lists } = await listRepository.create({
                    userId: listOwner!.userId,
                    lists: [{ name: uuid(), description: uuid() }],
                });
                const list = lists[0]!;

                await listRepository.saveMembers({
                    listId: list.listId,
                    members: [{ userId: user.userId, status }],
                });

                const { items } = await listRepository.createItems({
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
        },
    );

    withCxIt(
        "should not allow updating an item that belongs to another list",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);

            const { lists } = await listRepository.create({
                userId: user.userId,
                lists: [{ name: uuid() }, { name: uuid() }],
            });
            const [list1, list2] = lists;

            const { items } = await listRepository.createItems({
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
        },
    );

    withCxIt(
        "should fail if the request contains extraneous properties",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const { lists } = await listRepository.create({
                userId: user.userId,
                lists: [{ name: uuid() }],
            });
            const list = lists[0]!;

            const { items } = await listRepository.createItems({
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
        },
    );

    withCxIt(
        "should fail if the request contains invalid properties",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const { lists } = await listRepository.create({
                userId: user.userId,
                lists: [{ name: uuid() }],
            });
            const list = lists[0]!;

            const { items } = await listRepository.createItems({
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
        },
    );

    withCxIt("should fail if a required field is set to null", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);
        const { lists } = await listRepository.create({
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;
        const { items } = await listRepository.createItems({
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
    withCxIt("should require authentication", async () => {
        const res = await request(app).delete(
            `/v1/lists/${uuid()}/items/${uuid()}`,
        );
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should delete a list item", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const { lists } = await listRepository.create({
            userId: user.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        const { items } = await listRepository.createItems({
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

        const { items: remainingItems } = await listRepository.readAllItems({
            userId: user.userId,
            filter: { listId: list.listId },
        });
        expect(remainingItems.length).toEqual(0);
    });

    withCxIt(
        "should allow deleting an item if the user is a list administrator",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [listOwner] = await CreateUsers(userRepository);

            const { lists } = await listRepository.create({
                userId: listOwner!.userId,
                lists: [{ name: uuid(), description: uuid() }],
            });
            const list = lists[0]!;

            await listRepository.saveMembers({
                listId: list.listId,
                members: [{ userId: user.userId, status: "A" }],
            });

            const { items } = await listRepository.createItems({
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

            const { items: remainingItems } = await listRepository.readAllItems(
                {
                    userId: listOwner!.userId,
                    filter: { listId: list.listId },
                },
            );
            expect(remainingItems.length).toEqual(0);
        },
    );

    withCxIt(
        "should not allow deleting an item if the user is a list member, pending, or blacklisted",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [listOwner] = await CreateUsers(userRepository);

            const statuses = ["M", "P", "B"] as const;

            for (const status of statuses) {
                const { lists } = await listRepository.create({
                    userId: listOwner!.userId,
                    lists: [{ name: uuid(), description: uuid() }],
                });
                const list = lists[0]!;

                await listRepository.saveMembers({
                    listId: list.listId,
                    members: [{ userId: user.userId, status }],
                });

                const { items } = await listRepository.createItems({
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
        },
    );

    withCxIt(
        "should not allow deleting an item that belongs to another list",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);

            const { lists } = await listRepository.create({
                userId: user.userId,
                lists: [{ name: uuid() }, { name: uuid() }],
            });
            const [list1, list2] = lists;

            const { items } = await listRepository.createItems({
                userId: user.userId,
                listId: list2!.listId,
                items: [{ name: uuid() }],
            });
            const itemOnList2 = items[0]!;

            const res = await request(app)
                .delete(
                    `/v1/lists/${list1!.listId}/items/${itemOnList2.itemId}`,
                )
                .set(token)
                .send();

            expect(res.statusCode).toEqual(404);
        },
    );
});

describe("Get list members", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).get(`/v1/lists/${uuid()}/members`);
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should return list members", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);
        const [member] = await CreateUsers(userRepository);

        const { lists } = await listRepository.create({
            userId: user.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        await listRepository.saveMembers({
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

    withCxIt(
        "should return 404 for the member list if the user is not the owner",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [listOwner] = await CreateUsers(userRepository);

            const statuses = ["A", "M", "P", "B"] as const;

            for (const status of statuses) {
                const { lists } = await listRepository.create({
                    userId: listOwner!.userId,
                    lists: [{ name: uuid(), description: uuid() }],
                });
                const list = lists[0]!;

                await listRepository.saveMembers({
                    listId: list.listId,
                    members: [{ userId: user.userId, status }],
                });

                const res = await request(app)
                    .get(`/v1/lists/${list.listId}/members`)
                    .set(token);

                expect(res.statusCode).toEqual(404);
            }
        },
    );
});

describe("Invite member to list", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).post(`/v1/lists/${uuid()}/members`);
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should invite a member", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);
        const [invitee] = await CreateUsers(userRepository);

        const { lists } = await listRepository.create({
            userId: user.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        const res = await request(app)
            .post(`/v1/lists/${list.listId}/members`)
            .set(token)
            .send({ userId: invitee!.userId });

        expect(res.statusCode).toEqual(204);

        const [members] = await listRepository.readMembers({
            listId: list.listId,
        });
        expect(members!.members).toHaveLength(1);
        expect(members!.members[0]!.status).toEqual("P");
    });

    withCxIt("should return 400 if the user is already a member", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);
        const [member] = await CreateUsers(userRepository);

        const { lists } = await listRepository.create({
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;

        await listRepository.saveMembers({
            listId: list.listId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const res = await request(app)
            .post(`/v1/lists/${list.listId}/members`)
            .set(token)
            .send({ userId: member!.userId });

        expect(res.statusCode).toEqual(400);
    });

    withCxIt(
        "should return 404 for an invite if the user is not the owner",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [listOwner] = await CreateUsers(userRepository);
            const [invitee] = await CreateUsers(userRepository);

            const statuses = ["A", "M", "P", "B"] as const;

            for (const status of statuses) {
                const { lists } = await listRepository.create({
                    userId: listOwner!.userId,
                    lists: [{ name: uuid(), description: uuid() }],
                });
                const list = lists[0]!;

                await listRepository.saveMembers({
                    listId: list.listId,
                    members: [{ userId: user.userId, status }],
                });

                const res = await request(app)
                    .post(`/v1/lists/${list.listId}/members`)
                    .set(token)
                    .send({ userId: invitee!.userId });

                expect(res.statusCode).toEqual(404);
            }
        },
    );

    withCxIt("should return 404 if the user does not exist", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);
        const { lists } = await listRepository.create({
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

    withCxIt(
        "should fail if the request contains extraneous properties",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const { lists } = await listRepository.create({
                userId: user.userId,
                lists: [{ name: uuid() }],
            });
            const list = lists[0]!;

            const res = await request(app)
                .post(`/v1/lists/${list.listId}/members`)
                .set(token)
                .send({ userId: uuid(), extra: "invalid" });
            expect(res.statusCode).toEqual(400);
        },
    );

    withCxIt(
        "should fail if the request contains invalid properties",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const { lists } = await listRepository.create({
                userId: user.userId,
                lists: [{ name: uuid() }],
            });
            const list = lists[0]!;

            const res = await request(app)
                .post(`/v1/lists/${list.listId}/members`)
                .set(token)
                .send({ userId: 12345 });
            expect(res.statusCode).toEqual(400);
        },
    );
});

describe("Update list member", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).patch(
            `/v1/lists/${uuid()}/members/${uuid()}`,
        );
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should update member status", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);
        const [member] = await CreateUsers(userRepository);

        const { lists } = await listRepository.create({
            userId: user.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        await listRepository.saveMembers({
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

    withCxIt(
        "should not allow non-owners (A, M, P, B) to update a member status",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [owner] = await CreateUsers(userRepository);
            const [member] = await CreateUsers(userRepository);

            const statuses = ["A", "M", "P", "B"] as const;

            for (const status of statuses) {
                const { lists } = await listRepository.create({
                    userId: owner!.userId,
                    lists: [{ name: uuid(), description: uuid() }],
                });
                const list = lists[0]!;

                await listRepository.saveMembers([
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
        },
    );

    withCxIt(
        "should fail when trying to update a member to restricted statuses (O, P)",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [member] = await CreateUsers(userRepository);

            const { lists } = await listRepository.create({
                userId: user.userId,
                lists: [{ name: uuid() }],
            });
            const list = lists[0]!;

            await listRepository.saveMembers({
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
        },
    );

    withCxIt(
        "should return 400 when trying to update a pending member",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [member] = await CreateUsers(userRepository);

            const { lists } = await listRepository.create({
                userId: user.userId,
                lists: [{ name: uuid() }],
            });
            const list = lists[0]!;

            await listRepository.saveMembers({
                listId: list.listId,
                members: [{ userId: member!.userId, status: "P" }],
            });

            const res = await request(app)
                .patch(`/v1/lists/${list.listId}/members/${member!.userId}`)
                .set(token)
                .send({ status: "M" });

            expect(res.statusCode).toEqual(400);
        },
    );

    withCxIt(
        "should fail if the request contains extraneous properties",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [member] = await CreateUsers(userRepository);
            const { lists } = await listRepository.create({
                userId: user.userId,
                lists: [{ name: uuid() }],
            });
            const list = lists[0]!;
            await listRepository.saveMembers({
                listId: list.listId,
                members: [{ userId: member!.userId, status: "M" }],
            });

            const res = await request(app)
                .patch(`/v1/lists/${list.listId}/members/${member!.userId}`)
                .set(token)
                .send({ status: "A", extra: "invalid" });
            expect(res.statusCode).toEqual(400);
        },
    );

    withCxIt(
        "should fail if the request contains invalid properties",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [member] = await CreateUsers(userRepository);
            const { lists } = await listRepository.create({
                userId: user.userId,
                lists: [{ name: uuid() }],
            });
            const list = lists[0]!;
            await listRepository.saveMembers({
                listId: list.listId,
                members: [{ userId: member!.userId, status: "M" }],
            });

            const res = await request(app)
                .patch(`/v1/lists/${list.listId}/members/${member!.userId}`)
                .set(token)
                .send({ status: "INVALID" });
            expect(res.statusCode).toEqual(400);
        },
    );

    withCxIt("should fail if a required field is set to null", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);
        const [member] = await CreateUsers(userRepository);
        const { lists } = await listRepository.create({
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;
        await listRepository.saveMembers({
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
    withCxIt("should require authentication", async () => {
        const res = await request(app).delete(
            `/v1/lists/${uuid()}/members/${uuid()}`,
        );
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should remove a member", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);
        const [member] = await CreateUsers(userRepository);

        const { lists } = await listRepository.create({
            userId: user.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        await listRepository.saveMembers({
            listId: list.listId,
            members: [{ userId: member!.userId, status: "M" }],
        });

        const res = await request(app)
            .delete(`/v1/lists/${list.listId}/members/${member!.userId}`)
            .set(token);

        expect(res.statusCode).toEqual(204);

        const [members] = await listRepository.readMembers({
            listId: list.listId,
        });
        expect(members!.members).toHaveLength(0);
    });

    withCxIt(
        "should not allow non-owners (A, M, P, B) to remove a member",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [owner] = await CreateUsers(userRepository);
            const [member] = await CreateUsers(userRepository);

            const statuses = ["A", "M", "P", "B"] as const;

            for (const status of statuses) {
                const { lists } = await listRepository.create({
                    userId: owner!.userId,
                    lists: [{ name: uuid(), description: uuid() }],
                });
                const list = lists[0]!;

                await listRepository.saveMembers([
                    {
                        listId: list.listId,
                        members: [
                            { userId: user.userId, status },
                            { userId: member!.userId, status: "M" },
                        ],
                    },
                ]);

                const res = await request(app)
                    .delete(
                        `/v1/lists/${list.listId}/members/${member!.userId}`,
                    )
                    .set(token);

                expect(res.statusCode).toEqual(404);
            }
        },
    );
});

describe("Accept list invitation", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).post(
            `/v1/lists/${uuid()}/invite/accept`,
        );
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should accept invitation", async () => {
        const [owner] = await CreateUsers(userRepository);
        const [token, invitee] = await PrepareAuthenticatedUser(userRepository);

        const { lists } = await listRepository.create({
            userId: owner!.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        await listRepository.saveMembers({
            listId: list.listId,
            members: [{ userId: invitee.userId, status: "P" }],
        });

        const res = await request(app)
            .post(`/v1/lists/${list.listId}/invite/accept`)
            .set(token);

        expect(res.statusCode).toEqual(204);

        const [members] = await listRepository.readMembers({
            listId: list.listId,
        });
        expect(members!.members[0]!.status).toEqual("M");
    });

    withCxIt(
        "should return 404 when accepting an invite if the user is already a member (A, M) or blacklisted (B)",
        async () => {
            const [inviteeToken, invitee] =
                await PrepareAuthenticatedUser(userRepository);
            const [owner] = await CreateUsers(userRepository);

            const statuses = ["A", "M", "B"] as const;

            for (const status of statuses) {
                const { lists } = await listRepository.create({
                    userId: owner!.userId,
                    lists: [{ name: uuid() }],
                });
                const list = lists[0]!;

                await listRepository.saveMembers({
                    listId: list.listId,
                    members: [{ userId: invitee.userId, status }],
                });

                const res = await request(app)
                    .post(`/v1/lists/${list.listId}/invite/accept`)
                    .set(inviteeToken);

                expect(res.statusCode).toEqual(404);
            }
        },
    );
});

describe("Decline list invitation", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).post(
            `/v1/lists/${uuid()}/invite/decline`,
        );
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should decline invitation", async () => {
        const [owner] = await CreateUsers(userRepository);
        const [token, invitee] = await PrepareAuthenticatedUser(userRepository);

        const { lists } = await listRepository.create({
            userId: owner!.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        await listRepository.saveMembers({
            listId: list.listId,
            members: [{ userId: invitee.userId, status: "P" }],
        });

        const res = await request(app)
            .post(`/v1/lists/${list.listId}/invite/decline`)
            .set(token);

        expect(res.statusCode).toEqual(204);

        const [members] = await listRepository.readMembers({
            listId: list.listId,
        });
        expect(members!.members).toHaveLength(0);
    });

    withCxIt(
        "should return 404 when declining an invite if the user is already a member (A, M) or blacklisted (B)",
        async () => {
            const [inviteeToken, invitee] =
                await PrepareAuthenticatedUser(userRepository);
            const [owner] = await CreateUsers(userRepository);

            const statuses = ["A", "M", "B"] as const;

            for (const status of statuses) {
                const { lists } = await listRepository.create({
                    userId: owner!.userId,
                    lists: [{ name: uuid() }],
                });
                const list = lists[0]!;

                await listRepository.saveMembers({
                    listId: list.listId,
                    members: [{ userId: invitee.userId, status }],
                });

                const res = await request(app)
                    .post(`/v1/lists/${list.listId}/invite/decline`)
                    .set(inviteeToken);

                expect(res.statusCode).toEqual(404);
            }
        },
    );
});

describe("Leave list", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).post(`/v1/lists/${uuid()}/leave`);
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should leave list", async () => {
        const [owner] = await CreateUsers(userRepository);
        const [token, member] = await PrepareAuthenticatedUser(userRepository);

        const { lists } = await listRepository.create({
            userId: owner!.userId,
            lists: [{ name: uuid(), description: uuid() }],
        });
        const list = lists[0]!;

        await listRepository.saveMembers({
            listId: list.listId,
            members: [{ userId: member.userId, status: "M" }],
        });

        const res = await request(app)
            .post(`/v1/lists/${list.listId}/leave`)
            .set(token);

        expect(res.statusCode).toEqual(204);

        const [members] = await listRepository.readMembers({
            listId: list.listId,
        });
        expect(members!.members).toHaveLength(0);
    });

    withCxIt(
        "should return 404 if the owner tries to leave the list",
        async () => {
            const [ownerToken, owner] =
                await PrepareAuthenticatedUser(userRepository);

            const { lists } = await listRepository.create({
                userId: owner.userId,
                lists: [{ name: uuid(), description: uuid() }],
            });
            const list = lists[0]!;

            const res = await request(app)
                .post(`/v1/lists/${list.listId}/leave`)
                .set(ownerToken);

            expect(res.statusCode).toEqual(404);
        },
    );

    withCxIt(
        "should return 404 if a pending or blacklisted user tries to leave the list",
        async () => {
            const [_ownerToken, owner] =
                await PrepareAuthenticatedUser(userRepository);
            const [userToken, user] =
                await PrepareAuthenticatedUser(userRepository);

            const statuses = ["P", "B"] as const;

            for (const status of statuses) {
                const { lists } = await listRepository.create({
                    userId: owner.userId,
                    lists: [{ name: uuid() }],
                });
                const list = lists[0]!;

                await listRepository.saveMembers({
                    listId: list.listId,
                    members: [{ userId: user.userId, status }],
                });

                const res = await request(app)
                    .post(`/v1/lists/${list.listId}/leave`)
                    .set(userToken);

                expect(res.statusCode).toEqual(404);
            }
        },
    );
});

describe("Move list items to another list", () => {
    withCxIt("should require authentication", async () => {
        const res = await request(app).post(`/v1/lists/${uuid()}/items/move`);
        expect(res.statusCode).toEqual(401);
    });

    withCxIt("should move items to another list", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);

        const { lists } = await listRepository.create({
            userId: user.userId,
            lists: [{ name: uuid() }, { name: uuid() }],
        });
        const [sourceList, destList] = lists;

        const { items } = await listRepository.createItems({
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
        const { items: sourceItems } = await listRepository.readAllItems({
            userId: user.userId,
            filter: { listId: sourceList!.listId },
        });
        expect(sourceItems).toHaveLength(0);

        // Verify added to destination
        const { items: destItems } = await listRepository.readAllItems({
            userId: user.userId,
            filter: { listId: destList!.listId },
        });
        expect(destItems).toHaveLength(1);
        expect(destItems[0]!.itemId).toEqual(item.itemId);
    });

    withCxIt("should fail if moving to the same list", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);
        const { lists } = await listRepository.create({
            userId: user.userId,
            lists: [{ name: uuid() }],
        });
        const list = lists[0]!;
        const { items } = await listRepository.createItems({
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

    withCxIt(
        "should fail if user does not have access to destination list",
        async () => {
            const [token, user] =
                await PrepareAuthenticatedUser(userRepository);
            const [otherUser] = await CreateUsers(userRepository);

            const { lists: sourceLists } = await listRepository.create({
                userId: user.userId,
                lists: [{ name: uuid() }],
            });
            const { lists: destLists } = await listRepository.create({
                userId: otherUser!.userId,
                lists: [{ name: uuid() }],
            });

            const sourceList = sourceLists[0]!;
            const destList = destLists[0]!;

            const { items } = await listRepository.createItems({
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
        },
    );

    withCxIt("should fail if item does not exist in source list", async () => {
        const [token, user] = await PrepareAuthenticatedUser(userRepository);
        const { lists } = await listRepository.create({
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
