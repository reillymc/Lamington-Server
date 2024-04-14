import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { ListActions, ListItemActions, ListMemberActions } from "../../../src/controllers";
import { ListService } from "../../../src/controllers/spec";
import { ServiceParams } from "../../../src/database";
import { UserStatus } from "../../../src/routes/spec";
import { CleanTables, CreateUsers, ListEndpoint, PrepareAuthenticatedUser, randomBoolean } from "../../helpers";

beforeEach(async () => {
    await CleanTables("list", "user", "list_member", "list_item");
});

afterAll(async () => {
    await CleanTables("list", "user", "list_member", "list_item");
});

test("route should require authentication", async () => {
    const res = await request(app).delete(ListEndpoint.deleteListItem(uuid(), uuid()));

    expect(res.statusCode).toEqual(401);
});

test("should return 404 for non-existant list", async () => {
    const [token] = await PrepareAuthenticatedUser();

    const res = await request(app).delete(ListEndpoint.deleteListItem(uuid(), uuid())).set(token).send();

    expect(res.statusCode).toEqual(404);
});

test("should not allow deletion if not list owner", async () => {
    const [token] = await PrepareAuthenticatedUser();
    const [listOwner] = await CreateUsers();

    const list = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: listOwner!.userId,
    } satisfies ServiceParams<ListService, "Save">;

    const listItem = {
        itemId: uuid(),
        name: uuid(),
        completed: randomBoolean(),
        listId: list.listId,
        createdBy: listOwner!.userId,
    } satisfies ServiceParams<ListItemActions, "save">;

    await ListActions.Save(list);
    await ListItemActions.save(listItem);

    const res = await request(app).delete(ListEndpoint.deleteListItem(list.listId, listItem.itemId)).set(token).send();

    expect(res.statusCode).toEqual(403);
});

test("should not allow deletion if list member without edit permission", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [listOwner] = await CreateUsers();

    const list = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: listOwner!.userId,
    } satisfies ServiceParams<ListService, "Save">;

    const listItem = {
        itemId: uuid(),
        name: uuid(),
        completed: randomBoolean(),
        listId: list.listId,
        createdBy: user.userId,
    } satisfies ServiceParams<ListItemActions, "save">;

    await ListActions.Save(list);
    await ListItemActions.save(listItem);
    await ListMemberActions.save({
        listId: list.listId,
        members: [
            {
                userId: user!.userId,
                status: UserStatus.Registered,
            },
        ],
    });

    const res = await request(app).delete(ListEndpoint.deleteListItem(list.listId, listItem.itemId)).set(token).send();

    expect(res.statusCode).toEqual(403);
});

test("should allow deletion if list member with edit permission", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [listOwner] = await CreateUsers();

    const list = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: listOwner!.userId,
    } satisfies ServiceParams<ListService, "Save">;

    const listItem = {
        itemId: uuid(),
        name: uuid(),
        completed: randomBoolean(),
        listId: list.listId,
        createdBy: user.userId,
    } satisfies ServiceParams<ListItemActions, "save">;

    await ListActions.Save(list);
    await ListItemActions.save(listItem);
    await ListMemberActions.save({
        listId: list.listId,
        members: [
            {
                userId: user!.userId,
                status: UserStatus.Administrator,
            },
        ],
    });

    const res = await request(app).delete(ListEndpoint.deleteListItem(list.listId, listItem.itemId)).set(token).send();

    expect(res.statusCode).toEqual(201);

    const listItems = await ListItemActions.read({ listId: list.listId });

    expect(listItems.length).toEqual(0);
});

test("should allow deletion if list owner", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const list = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user.userId,
    } satisfies ServiceParams<ListService, "Save">;

    const listItem = {
        itemId: uuid(),
        name: uuid(),
        completed: randomBoolean(),
        listId: list.listId,
        createdBy: user.userId,
    } satisfies ServiceParams<ListItemActions, "save">;

    await ListActions.Save(list);
    await ListItemActions.save(listItem);

    const res = await request(app).delete(ListEndpoint.deleteListItem(list.listId, listItem.itemId)).set(token).send();

    expect(res.statusCode).toEqual(201);

    const listItems = await ListItemActions.read({ listId: list.listId });

    expect(listItems.length).toEqual(0);
});
