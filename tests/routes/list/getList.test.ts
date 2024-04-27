import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { ListActions, ListItemActions, ListMemberActions } from "../../../src/controllers";
import { ListItemService, ListService } from "../../../src/controllers/spec";
import { ServiceParams } from "../../../src/database";
import { ListCustomisations } from "../../../src/routes/helpers";
import { GetListResponse, UserStatus } from "../../../src/routes/spec";
import { CreateUsers, ListEndpoint, PrepareAuthenticatedUser, randomBoolean, randomNumber } from "../../helpers";

const getListCustomisations = (): ListCustomisations => {
    return {
        icon: uuid(),
    };
};

test("route should require authentication", async () => {
    const res = await request(app).get(ListEndpoint.getList(uuid()));

    expect(res.statusCode).toEqual(401);
});

test("should return 404 for non-existant list", async () => {
    const [token] = await PrepareAuthenticatedUser();

    const res = await request(app).get(ListEndpoint.getList(uuid())).set(token);

    expect(res.statusCode).toEqual(404);
});

test("should not return list user doesn't have access to", async () => {
    const [token] = await PrepareAuthenticatedUser();
    const [listOwner] = await CreateUsers();

    const createListParams = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: listOwner!.userId,
    } satisfies ServiceParams<ListService, "Save">;

    await ListActions.Save(createListParams);

    const res = await request(app).get(ListEndpoint.getList(createListParams.listId)).set(token);

    expect(res.statusCode).toEqual(404);
});

test("should return correct list details for list id", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const customisations = getListCustomisations();

    const createListParams = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        customisations,
        createdBy: user.userId,
    } satisfies ServiceParams<ListService, "Save">;

    await ListActions.Save(createListParams);

    const res = await request(app).get(ListEndpoint.getList(createListParams.listId)).set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetListResponse;

    expect(data?.listId).toEqual(createListParams.listId);
    expect(data?.name).toEqual(createListParams.name);
    expect(data?.icon).toEqual(customisations.icon);
    expect(data?.description).toEqual(createListParams.description);
    expect(data?.createdBy.userId).toEqual(createListParams.createdBy);
    expect(data?.createdBy.firstName).toEqual(user.firstName);
});

test("should return a list that a user is a member of", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [listOwner] = await CreateUsers();

    const createListParams = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: listOwner!.userId,
        members: [{ userId: user.userId }],
    } satisfies ServiceParams<ListService, "Save">;

    await ListActions.Save(createListParams);

    const res = await request(app).get(ListEndpoint.getList(createListParams.listId)).set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetListResponse;

    expect(data?.listId).toEqual(createListParams.listId);
});

test("should return list items", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const list = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user.userId,
    } satisfies ServiceParams<ListService, "Save">;

    const otherList = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user.userId,
    } satisfies ServiceParams<ListService, "Save">;

    await ListActions.Save([list, otherList]);

    const itemsInList = Array.from({ length: randomNumber() }).map(
        () =>
            ({
                itemId: uuid(),
                name: uuid(),
                completed: randomBoolean(),
                listId: list.listId,
                createdBy: user.userId,
            } satisfies ServiceParams<ListItemService, "Save">)
    );

    const itemsNotInList = Array.from({ length: randomNumber() }).map(
        () =>
            ({
                itemId: uuid(),
                name: uuid(),
                completed: randomBoolean(),
                listId: otherList.listId,
                createdBy: user.userId,
            } satisfies ServiceParams<ListItemService, "Save">)
    );

    await ListItemActions.Save(itemsInList);

    const res = await request(app).get(ListEndpoint.getList(list.listId)).set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetListResponse;

    const listItemData = Object.values(data!.items!);

    expect(listItemData.length).toEqual(itemsInList.length);
    expect(listItemData.every(({ itemId }) => itemsInList.some(item => item.itemId === itemId))).toEqual(true);
    expect(listItemData.every(({ itemId }) => itemsNotInList.every(item => item.itemId !== itemId))).toEqual(true);
});

test("should return list members", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [listMember] = await CreateUsers();

    const list = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user.userId,
    } satisfies ServiceParams<ListService, "Save">;

    await ListActions.Save(list);

    await ListMemberActions.save({
        listId: list.listId,
        members: [
            {
                userId: listMember!.userId,
                status: UserStatus.Administrator,
            },
        ],
    });

    const res = await request(app).get(ListEndpoint.getList(list.listId)).set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetListResponse;

    const listItemData = Object.values(data?.members ?? {});

    expect(listItemData.length).toEqual(1);
    expect(listItemData[0]?.userId).toEqual(listMember?.userId);
});
