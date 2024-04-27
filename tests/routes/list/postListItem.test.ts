import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { IngredientActions, ListActions, ListItemActions, ListMemberActions } from "../../../src/controllers";
import { ListService } from "../../../src/controllers/spec";
import { ServiceParams } from "../../../src/database";
import { PostListItemRequestBody, UserStatus } from "../../../src/routes/spec";
import { CleanTables, CreateUsers, ListEndpoint, PrepareAuthenticatedUser, randomBoolean } from "../../helpers";
import { generateRandomAmount } from "../../helpers/list";

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

test("should not allow adding list item if not list owner", async () => {
    const [token] = await PrepareAuthenticatedUser();
    const [listOwner] = await CreateUsers();

    const list = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: listOwner!.userId,
    } satisfies ServiceParams<ListService, "Save">;

    await ListActions.Save(list);

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
    } satisfies ServiceParams<ListService, "Save">;

    const item = {
        itemId: uuid(),
        name: uuid(),
        completed: randomBoolean(),
        listId: list.listId,
        createdBy: user.userId,
    } satisfies ServiceParams<ListItemActions, "save">;

    await ListActions.Save(list);
    await ListItemActions.save(item);
    await ListMemberActions.save({
        listId: list.listId,
        members: [
            {
                userId: user!.userId,
                status: UserStatus.Member,
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
    } satisfies ServiceParams<ListService, "Save">;

    const item = {
        itemId: uuid(),
        name: uuid(),
        completed: randomBoolean(),
        listId: list.listId,
        createdBy: user.userId,
    } satisfies ServiceParams<ListItemActions, "save">;

    await ListActions.Save(list);
    await ListItemActions.save(item);
    await ListMemberActions.save({
        listId: list.listId,
        members: [
            {
                userId: user!.userId,
                status: UserStatus.Administrator,
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
    } satisfies ServiceParams<ListService, "Save">;

    const item = {
        itemId: uuid(),
        name: uuid(),
        completed: randomBoolean(),
        listId: list.listId,
        createdBy: user.userId,
    } satisfies ServiceParams<ListItemActions, "save">;

    await ListActions.Save(list);
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

test("should save and return all fields", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const list = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user!.userId,
    } satisfies ServiceParams<ListService, "Save">;

    await ListActions.Save(list);

    const ingredient = {
        ingredientId: uuid(),
        name: uuid(),
        createdBy: user!.userId,
    } satisfies ServiceParams<IngredientActions, "save">;

    await IngredientActions.save(ingredient);

    const listItem = {
        itemId: uuid(),
        name: uuid(),
        completed: randomBoolean(),
        createdBy: user!.userId,
        amount: generateRandomAmount(),
        ingredientId: ingredient.ingredientId,
        unit: uuid(),
        notes: uuid(),
    } satisfies PostListItemRequestBody["data"];

    const res = await request(app)
        .post(ListEndpoint.postListItem(list.listId))
        .set(token)
        .send({ data: listItem } satisfies PostListItemRequestBody);

    expect(res.statusCode).toEqual(201);

    const listItems = await ListItemActions.read({ listId: list.listId });

    expect(listItems.length).toEqual(1);

    const [item] = listItems;

    expect(item?.listId).toEqual(list.listId);
    expect(item?.itemId).toEqual(listItem.itemId);
    expect(item?.name).toEqual(listItem.name);
    expect(item?.completed).toEqual(listItem.completed);
    expect(item?.ingredientId).toEqual(listItem.ingredientId);
    expect(item?.unit).toEqual(listItem.unit);
    expect(item?.amount).toMatchObject(listItem.amount);
    expect(item?.notes).toEqual(listItem.notes);
    expect(item?.createdBy).toEqual(user?.userId);
});

test("should move list item from one list to another", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const previousList = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user!.userId,
    } satisfies ServiceParams<ListService, "Save">;

    const otherList = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user!.userId,
    } satisfies ServiceParams<ListService, "Save">;

    await ListActions.Save([previousList, otherList]);

    const listItem = {
        itemId: uuid(),
        name: uuid(),
    } satisfies PostListItemRequestBody["data"];

    await request(app)
        .post(ListEndpoint.postListItem(previousList.listId))
        .set(token)
        .send({ data: listItem } satisfies PostListItemRequestBody);

    const res = await request(app)
        .post(ListEndpoint.postListItem(otherList.listId))
        .set(token)
        .send({ data: { ...listItem, previousListId: previousList.listId } } satisfies PostListItemRequestBody);

    expect(res.statusCode).toEqual(201);

    const listItems = await ListItemActions.read({ listId: otherList.listId });

    expect(listItems.length).toEqual(1);

    const [item] = listItems;

    expect(item?.listId).toEqual(otherList.listId);
    expect(item?.itemId).toEqual(listItem.itemId);
    expect(item?.name).toEqual(listItem.name);
    expect(item?.createdBy).toEqual(user?.userId);

    const previousListsItems = await ListItemActions.read({ listId: previousList.listId });

    expect(previousListsItems.length).toEqual(0);
});
