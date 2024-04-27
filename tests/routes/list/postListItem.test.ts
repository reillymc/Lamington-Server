import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { IngredientActions, ListActions, ListItemActions, ListMemberActions } from "../../../src/controllers";
import { ListItemService, ListService } from "../../../src/controllers/spec";
import { ServiceParams } from "../../../src/database";
import { PostListItemRequestBody, UserStatus } from "../../../src/routes/spec";
import { CreateUsers, ListEndpoint, PrepareAuthenticatedUser, randomBoolean } from "../../helpers";
import { generateRandomAmount } from "../../helpers/list";

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
    } satisfies ServiceParams<ListItemService, "Save">;

    await ListActions.Save(list);
    await ListItemActions.Save(item);
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
    } satisfies ServiceParams<ListItemService, "Save">;

    await ListActions.Save(list);
    await ListItemActions.Save(item);
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
    } satisfies ServiceParams<ListItemService, "Save">;

    const res = await request(app)
        .post(ListEndpoint.postListItem(list.listId))
        .set(token)
        .send({ data: updatedItem } satisfies PostListItemRequestBody);

    expect(res.statusCode).toEqual(201);

    const listItems = await ListItemActions.Read({ listId: list.listId });

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
    } satisfies ServiceParams<ListItemService, "Save">;

    await ListActions.Save(list);
    await ListItemActions.Save(item);

    const updatedItem = {
        ...item,
        name: uuid(),
    } satisfies ServiceParams<ListItemService, "Save">;

    const res = await request(app)
        .post(ListEndpoint.postListItem(list.listId))
        .set(token)
        .send({ data: updatedItem } satisfies PostListItemRequestBody);

    expect(res.statusCode).toEqual(201);

    const listItems = await ListItemActions.Read({ listId: list.listId });

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

    const listItems = await ListItemActions.Read({ listId: list.listId });

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

    const sourceList = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user!.userId,
    } satisfies ServiceParams<ListService, "Save">;

    const destinationList = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user!.userId,
    } satisfies ServiceParams<ListService, "Save">;

    await ListActions.Save([sourceList, destinationList]);

    const listItem = {
        itemId: uuid(),
        name: uuid(),
    } satisfies PostListItemRequestBody["data"];

    await request(app)
        .post(ListEndpoint.postListItem(sourceList.listId))
        .set(token)
        .send({ data: listItem } satisfies PostListItemRequestBody);

    const res = await request(app)
        .post(ListEndpoint.postListItem(destinationList.listId))
        .set(token)
        .send({ data: { ...listItem, previousListId: sourceList.listId } } satisfies PostListItemRequestBody);

    expect(res.statusCode).toEqual(201);

    const destinationListItems = await ListItemActions.Read({ listId: destinationList.listId });

    expect(destinationListItems.length).toEqual(1);

    const [item] = destinationListItems;

    expect(item?.listId).toEqual(destinationList.listId);
    expect(item?.itemId).toEqual(listItem.itemId);
    expect(item?.name).toEqual(listItem.name);
    expect(item?.createdBy).toEqual(user?.userId);

    const sourceListsItems = await ListItemActions.Read({ listId: sourceList.listId });

    expect(sourceListsItems.length).toEqual(0);
});

test("should not move list item from source list to destination list if user does have edit permission on source list", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [otherUser] = await CreateUsers();

    const sourceList = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: otherUser!.userId,
    } satisfies ServiceParams<ListService, "Save">;

    const destinationList = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user!.userId,
    } satisfies ServiceParams<ListService, "Save">;

    await ListActions.Save([sourceList, destinationList]);

    const listItem = {
        itemId: uuid(),
        name: uuid(),
        completed: randomBoolean(),
        createdBy: randomBoolean() ? user.userId : otherUser!.userId,
        listId: sourceList.listId,
    } satisfies ServiceParams<ListItemService, "Save">;

    await ListItemActions.Save(listItem);

    const res = await request(app)
        .post(ListEndpoint.postListItem(destinationList.listId))
        .set(token)
        .send({ data: { ...listItem, previousListId: sourceList.listId } } satisfies PostListItemRequestBody);

    expect(res.statusCode).toEqual(403);

    const destinationListItems = await ListItemActions.Read({ listId: destinationList.listId });

    expect(destinationListItems.length).toEqual(0);

    const sourceListsItems = await ListItemActions.Read({ listId: sourceList.listId });

    expect(sourceListsItems.length).toEqual(1);
});

test("should not move list item from source list to destination list if user does not have edit permission on destination list", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [otherUser] = await CreateUsers();

    const sourceList = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user!.userId,
    } satisfies ServiceParams<ListService, "Save">;

    const destinationList = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: otherUser!.userId,
    } satisfies ServiceParams<ListService, "Save">;

    await ListActions.Save([sourceList, destinationList]);

    const listItem = {
        itemId: uuid(),
        name: uuid(),
        completed: randomBoolean(),
        createdBy: randomBoolean() ? user.userId : otherUser!.userId,
        listId: sourceList.listId,
    } satisfies ServiceParams<ListItemService, "Save">;

    await ListItemActions.Save(listItem);

    const res = await request(app)
        .post(ListEndpoint.postListItem(destinationList.listId))
        .set(token)
        .send({ data: { ...listItem, previousListId: sourceList.listId } } satisfies PostListItemRequestBody);

    expect(res.statusCode).toEqual(403);

    const destinationListItems = await ListItemActions.Read({ listId: destinationList.listId });

    expect(destinationListItems.length).toEqual(0);

    const sourceListsItems = await ListItemActions.Read({ listId: sourceList.listId });

    expect(sourceListsItems.length).toEqual(1);
});
