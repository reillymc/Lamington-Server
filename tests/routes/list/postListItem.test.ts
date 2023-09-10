import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { ListEndpoint, CleanTables, CreateUsers, PrepareAuthenticatedUser, randomBoolean } from "../../helpers";
import { ListActions, ListMemberActions, ListItemActions } from "../../../src/controllers";
import { PostListItemRequestBody } from "../../../src/routes/spec";
import { ServiceParams } from "../../../src/database";

beforeEach(async () => {
    await CleanTables("list", "user", "list_member", "list_item");
});

afterAll(async () => {
    await CleanTables("list", "user", "list_member", "list_item");
});

test("route should require authentication", async () => {
    const res = await request(app).post(ListEndpoint.postListItem(uuid()));

    expect(res.statusCode).toEqual(401);
});

test("should return 404 for non-existant list", async () => {
    const [token] = await PrepareAuthenticatedUser();

    const res = await request(app)
        .post(ListEndpoint.postListItem(uuid()))
        .set(token)
        .send({ data: { name: uuid() } } satisfies PostListItemRequestBody);

    expect(res.statusCode).toEqual(404);
});

test("should not allow editing if not list owner", async () => {
    const [token] = await PrepareAuthenticatedUser();
    const [listOwner] = await CreateUsers();

    const list = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: listOwner!.userId,
    } satisfies ServiceParams<ListActions, "save">;

    await ListActions.save(list);

    const res = await request(app)
        .post(ListEndpoint.postListItem(list.listId))
        .set(token)
        .send({ data: { name: uuid() } } satisfies PostListItemRequestBody);

    expect(res.statusCode).toEqual(403);
});

test("should not allow editing if list member without edit permission", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [listOwner] = await CreateUsers();

    const list = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: listOwner!.userId,
    } satisfies ServiceParams<ListActions, "save">;

    const item = {
        itemId: uuid(),
        name: uuid(),
        completed: randomBoolean(),
        listId: list.listId,
        createdBy: user.userId,
    } satisfies ServiceParams<ListItemActions, "save">;

    await ListActions.save(list);
    await ListItemActions.save(item);
    await ListMemberActions.save({
        listId: list.listId,
        members: [
            {
                userId: user!.userId,
                accepted: true,
                allowEditing: false,
            },
        ],
    });

    const res = await request(app)
        .post(ListEndpoint.postListItem(list.listId))
        .set(token)
        .send({ data: { name: item.itemId } } satisfies PostListItemRequestBody);

    expect(res.statusCode).toEqual(403);
});

test("should allow editing if list member with edit permission", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [listOwner] = await CreateUsers();

    const list = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: listOwner!.userId,
    } satisfies ServiceParams<ListActions, "save">;

    const item = {
        itemId: uuid(),
        name: uuid(),
        completed: randomBoolean(),
        listId: list.listId,
        createdBy: user.userId,
    } satisfies ServiceParams<ListItemActions, "save">;

    await ListActions.save(list);
    await ListItemActions.save(item);
    await ListMemberActions.save({
        listId: list.listId,
        members: [
            {
                userId: user!.userId,
                accepted: true,
                allowEditing: true,
            },
        ],
    });

    const updatedItem = {
        ...item,
        name: uuid(),
    } satisfies ServiceParams<ListItemActions, "save">;

    const res = await request(app)
        .post(ListEndpoint.postListItem(list.listId))
        .set(token)
        .send({ data: updatedItem } satisfies PostListItemRequestBody);

    expect(res.statusCode).toEqual(201);

    const listItems = await ListItemActions.read({ listId: list.listId });

    expect(listItems.length).toEqual(1);

    const [listItem] = listItems;

    expect(listItem?.listId).toEqual(list.listId);
    expect(listItem?.itemId).toEqual(item.itemId);
    expect(listItem?.name).toEqual(updatedItem.name);
});

test("should allow editing if list owner", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const list = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user.userId,
    } satisfies ServiceParams<ListActions, "save">;

    const item = {
        itemId: uuid(),
        name: uuid(),
        completed: randomBoolean(),
        listId: list.listId,
        createdBy: user.userId,
    } satisfies ServiceParams<ListItemActions, "save">;

    await ListActions.save(list);
    await ListItemActions.save(item);

    const updatedItem = {
        ...item,
        name: uuid(),
    } satisfies ServiceParams<ListItemActions, "save">;

    const res = await request(app)
        .post(ListEndpoint.postListItem(list.listId))
        .set(token)
        .send({ data: updatedItem } satisfies PostListItemRequestBody);

    expect(res.statusCode).toEqual(201);

    const listItems = await ListItemActions.read({ listId: list.listId });

    expect(listItems.length).toEqual(1);

    const [listItem] = listItems;

    expect(listItem?.listId).toEqual(list.listId);
    expect(listItem?.itemId).toEqual(item.itemId);
    expect(listItem?.name).toEqual(updatedItem.name);
});
