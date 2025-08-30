import { expect } from "expect";
import { before, describe, it } from "node:test";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { setupApp } from "../../src/app.ts";
import { IngredientActions, ListActions, ListItemActions, ListMemberActions } from "../../src/controllers/index.ts";
import type { CreateListMemberParams } from "../../src/controllers/listMember.ts";
import type { ListItemService, ListService } from "../../src/controllers/spec/index.ts";
import { type ServiceParams } from "../../src/database/index.ts";
import type { ListCustomisations } from "../../src/routes/helpers/index.ts";
import {
    type DeleteListRequestParams,
    type EntityMember,
    type GetListResponse,
    type GetListsResponse,
    type PostListItemRequestBody,
    type PostListRequestBody,
    UserStatus,
} from "../../src/routes/spec/index.ts";
import {
    CreateLists,
    CreateUsers,
    generateRandomAmount,
    ListEndpoint,
    PrepareAuthenticatedUser,
    randomBoolean,
    randomCount,
    randomNumber,
} from "../helpers/index.ts";

const getListCustomisations = (): ListCustomisations => {
    return {
        icon: uuid(),
    };
};

describe("get lists", () => {
    let app: Express.Application;

    before(async () => {
        app = setupApp();
    });

    it("should require authentication", async () => {
        const res = await request(app).get(ListEndpoint.getLists);

        expect(res.statusCode).toEqual(401);
    });

    it("should return only lists for current user", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const [otherUser] = await CreateUsers({ count: 1 });

        const [_, count] = await CreateLists({ createdBy: user.userId });
        await CreateLists({ createdBy: otherUser!.userId });

        const res = await request(app).get(ListEndpoint.getLists).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetListsResponse;

        expect(Object.keys(data ?? {}).length).toEqual(count);
    });

    it("should return correct list membership details for user", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const [otherUser] = await CreateUsers({ count: 1 });

        const [editableLists] = await CreateLists({ createdBy: otherUser!.userId });
        const [acceptedLists] = await CreateLists({ createdBy: otherUser!.userId });
        const [nonAcceptedLists] = await CreateLists({ createdBy: otherUser!.userId });

        await ListMemberActions.save([
            ...editableLists.map(
                ({ listId }): CreateListMemberParams => ({
                    listId,
                    members: [
                        {
                            userId: user.userId,
                            status: UserStatus.Administrator,
                        },
                    ],
                })
            ),
            ...acceptedLists.map(
                ({ listId }): CreateListMemberParams => ({
                    listId,
                    members: [
                        {
                            userId: user.userId,
                            status: UserStatus.Member,
                        },
                    ],
                })
            ),
            ...nonAcceptedLists.map(
                ({ listId }): CreateListMemberParams => ({
                    listId,
                    members: [{ userId: user.userId, status: UserStatus.Pending }],
                })
            ),
        ]);

        const res = await request(app).get(ListEndpoint.getLists).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetListsResponse;

        expect(Object.keys(data ?? {}).length).toEqual(
            editableLists.length + acceptedLists.length + nonAcceptedLists.length
        );

        const editableListIds = editableLists.map(({ listId }) => listId);
        const acceptedListIds = acceptedLists.map(({ listId }) => listId);
        const nonAcceptedListIds = nonAcceptedLists.map(({ listId }) => listId);

        Object.keys(data ?? {}).forEach(listId => {
            const { status } = data![listId]!;

            if (editableListIds.includes(listId)) {
                expect(status).toEqual(UserStatus.Administrator);
            } else if (acceptedListIds.includes(listId)) {
                expect(status).toEqual(UserStatus.Member);
            } else if (nonAcceptedListIds.includes(listId)) {
                expect(status).toEqual(UserStatus.Pending);
            }
        });
    });
});

describe("get list", () => {
    let app: Express.Application;

    before(async () => {
        app = setupApp();
    });

    it("should require authentication", async () => {
        const res = await request(app).get(ListEndpoint.getList(uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existant list", async () => {
        const [token] = await PrepareAuthenticatedUser();

        const res = await request(app).get(ListEndpoint.getList(uuid())).set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should not return list user doesn't have access to", async () => {
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

    it("should return correct list details for list id", async () => {
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

    it("should return a list that a user is a member of", async () => {
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

    it("should return list items", async () => {
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

    it("should return list members", async () => {
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
});

describe("post list", () => {
    let app: Express.Application;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).post(ListEndpoint.postList);

        expect(res.statusCode).toEqual(401);
    });

    it("should not allow editing if not list owner", async () => {
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
            .post(ListEndpoint.postList)
            .set(token)
            .send({ data: { listId: list.listId, name: "list" } } satisfies PostListRequestBody);

        expect(res.statusCode).toEqual(403);
    });

    it("should not allow editing if list member but not list owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const [listOwner] = await CreateUsers();

        const list = {
            listId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: listOwner!.userId,
        } satisfies ServiceParams<ListService, "Save">;

        await ListActions.Save(list);
        await ListMemberActions.save({
            listId: list.listId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Administrator,
                },
            ],
        });

        const res = await request(app)
            .post(ListEndpoint.postList)
            .set(token)
            .send({ data: { listId: list.listId, name: "list" } } satisfies PostListRequestBody);

        expect(res.statusCode).toEqual(403);
    });

    it("should create list", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const users = await CreateUsers();

        const lists = {
            data: Array.from({ length: randomNumber() }).map((_, i) => ({
                listId: uuid(),
                name: uuid(),
                icon: uuid(),
                description: uuid(),
                members: users!.map(({ userId }) => ({
                    userId,
                    status: randomBoolean() ? UserStatus.Administrator : UserStatus.Member,
                })),
            })),
        } satisfies PostListRequestBody;

        const res = await request(app).post(ListEndpoint.postList).set(token).send(lists);

        expect(res.statusCode).toEqual(201);

        const savedLists = await ListActions.ReadByUser({ userId: user.userId });

        expect(savedLists.length).toEqual(lists.data.length);

        expect(savedLists.length).toEqual(lists.data.length);

        const savedListMembers = await ListMemberActions.read(savedLists.map(({ listId }) => ({ entityId: listId })));

        for (const list of savedLists) {
            const expectedList = lists.data.find(({ listId }) => listId === list.listId);
            const actualListMembers = savedListMembers.filter(({ listId }) => listId === list.listId);

            expect(list?.name).toEqual(expectedList!.name);
            expect(list?.description).toEqual(expectedList!.description);
            expect(list.customisations?.icon).toEqual(expectedList!.icon);
            expect(list?.createdBy).toEqual(user.userId);
            expect(actualListMembers.length).toEqual(expectedList!.members.length);

            for (const { userId, status } of expectedList!.members) {
                const savedListMember = actualListMembers.find(({ userId: savedUserId }) => savedUserId === userId);

                expect(savedListMember).toBeTruthy();

                expect(savedListMember?.status).toEqual(status);
            }
        }
    });

    it("should save updated list details as list owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const list = {
            listId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: user.userId,
        } satisfies ServiceParams<ListService, "Save">;

        await ListActions.Save(list);

        const updatedList = {
            data: {
                listId: list.listId,
                name: uuid(),
                description: uuid(),
            },
        } satisfies PostListRequestBody;

        const res = await request(app).post(ListEndpoint.postList).set(token).send(updatedList);

        expect(res.statusCode).toEqual(201);

        const [savedList] = await ListActions.Read({ listId: list.listId, userId: user.userId });

        expect(savedList?.name).toEqual(updatedList.data.name);
        expect(savedList?.description).toEqual(updatedList.data.description);
        expect(savedList?.listId).toEqual(list.listId);
        expect(savedList?.createdBy).toEqual(list.createdBy);
    });

    it("should save additional list members", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const initialUsers = await CreateUsers({ count: randomCount });
        const additionalUsers = await CreateUsers({ count: randomCount });

        const initialMembers: EntityMember[] = initialUsers.map(({ userId }) => ({ userId }));
        const additionalMembers: EntityMember[] = additionalUsers.map(({ userId }) => ({ userId }));
        const allMembers = [...initialMembers, ...additionalMembers];

        const [list] = await ListActions.Save({
            listId: uuid(),
            createdBy: user.userId,
            name: uuid(),
            description: uuid(),
            members: initialMembers,
        });

        const initialListMembers = await ListMemberActions.read({ entityId: list!.listId });
        expect(initialListMembers.length).toEqual(initialMembers.length);

        const res = await request(app)
            .post(ListEndpoint.postList)
            .set(token)
            .send({ data: { ...list, members: allMembers } } satisfies PostListRequestBody);

        expect(res.statusCode).toEqual(201);

        const savedListMembers = await ListMemberActions.read({ entityId: list!.listId });

        expect(savedListMembers.length).toEqual(allMembers.length);

        savedListMembers.forEach(({ userId }) => {
            const savedListMember = allMembers.find(({ userId: savedUserId }) => savedUserId === userId);

            expect(savedListMember).toBeTruthy();
        });
    });

    it("should remove some list members", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const initialMembers = await CreateUsers({ count: randomCount });

        const members: EntityMember[] = initialMembers.map(({ userId }) => ({ userId }));
        const reducedMembers: EntityMember[] = members.slice(0, Math.max((members.length - 1) / 2));
        const excludedMembers: EntityMember[] = members.filter(
            ({ userId }) => !reducedMembers.find(({ userId: savedUserId }) => savedUserId === userId)
        );

        const [list] = await ListActions.Save({
            listId: uuid(),
            createdBy: user.userId,
            name: uuid(),
            description: uuid(),
            members,
        });

        const initialListMembers = await ListMemberActions.read({ entityId: list!.listId });
        expect(initialListMembers.length).toEqual(members.length);
        const res = await request(app)
            .post(ListEndpoint.postList)
            .set(token)
            .send({ data: { ...list, members: reducedMembers } } satisfies PostListRequestBody);

        expect(res.statusCode).toEqual(201);

        const updatedListMembers = await ListMemberActions.read({ entityId: list!.listId });
        expect(updatedListMembers.length).toEqual(reducedMembers.length);

        updatedListMembers.forEach(({ userId }) => {
            const savedListMember = reducedMembers.find(({ userId: savedUserId }) => savedUserId === userId);
            const illegalMember = excludedMembers.some(({ userId: savedUserId }) => savedUserId === userId);

            expect(savedListMember).toBeTruthy();
            expect(illegalMember).toBeFalsy();
        });
    });

    it("should remove all list members", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const members = await CreateUsers({ count: randomCount });

        const [list] = await ListActions.Save({
            listId: uuid(),
            createdBy: user.userId,
            name: uuid(),
            description: uuid(),
            members: members.map(({ userId }) => ({ userId })),
        });

        const initialListMembers = await ListMemberActions.read({ entityId: list!.listId });
        expect(initialListMembers.length).toEqual(members.length);

        const res = await request(app)
            .post(ListEndpoint.postList)
            .set(token)
            .send({ data: { ...list, members: [] } } satisfies PostListRequestBody);

        expect(res.statusCode).toEqual(201);

        const savedListMembers = await ListMemberActions.read({ entityId: list!.listId });

        expect(savedListMembers.length).toEqual(0);
    });
});

describe("delete list", () => {
    let app: Express.Application;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).delete(ListEndpoint.deleteList(uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existant list", async () => {
        const [token] = await PrepareAuthenticatedUser();

        const res = await request(app)
            .delete(ListEndpoint.deleteList(uuid()))
            .set(token)
            .send({ listId: uuid() } satisfies DeleteListRequestParams);

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if not list owner", async () => {
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
            .delete(ListEndpoint.deleteList(list.listId))
            .set(token)
            .send({ listId: list.listId } satisfies DeleteListRequestParams);

        expect(res.statusCode).toEqual(403);
    });

    it("should not allow deletion if list member but not list owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const [listOwner] = await CreateUsers();

        const list = {
            listId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: listOwner!.userId,
        } satisfies ServiceParams<ListService, "Save">;

        await ListActions.Save(list);
        await ListMemberActions.save({
            listId: list.listId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Administrator,
                },
            ],
        });

        const res = await request(app)
            .delete(ListEndpoint.deleteList(list.listId))
            .set(token)
            .send({ listId: list.listId } satisfies DeleteListRequestParams);

        expect(res.statusCode).toEqual(403);
    });

    it("should delete list", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const list = {
            listId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: user!.userId,
        } satisfies ServiceParams<ListService, "Save">;

        await ListActions.Save(list);

        const res = await request(app).delete(ListEndpoint.deleteList(list.listId)).set(token).send(list);

        expect(res.statusCode).toEqual(201);

        const lists = await ListActions.Read({ listId: list.listId, userId: user.userId });

        expect(lists.length).toEqual(0);
    });
});

describe("post list item", () => {
    let app: Express.Application;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).post(ListEndpoint.postListItem(uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existant list", async () => {
        const [token] = await PrepareAuthenticatedUser();

        const res = await request(app)
            .post(ListEndpoint.postListItem(uuid()))
            .set(token)
            .send({ data: { name: uuid() } } satisfies PostListItemRequestBody);

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow adding list item if not list owner", async () => {
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

    it("should not allow editing if list member without edit permission", async () => {
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

    it("should allow editing if list member with edit permission", async () => {
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

    it("should allow editing if list owner", async () => {
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

    it("should save and return all fields", async () => {
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

    it("should move list item from one list to another", async () => {
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

    it("should not move list item from source list to destination list if user does have edit permission on source list", async () => {
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

    it("should not move list item from source list to destination list if user does not have edit permission on destination list", async () => {
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
});

describe("delete list item", () => {
    let app: Express.Application;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).delete(ListEndpoint.deleteListItem(uuid(), uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existant list", async () => {
        const [token] = await PrepareAuthenticatedUser();

        const res = await request(app).delete(ListEndpoint.deleteListItem(uuid(), uuid())).set(token).send();

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if not list owner", async () => {
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
        } satisfies ServiceParams<ListItemService, "Save">;

        await ListActions.Save(list);
        await ListItemActions.Save(listItem);

        const res = await request(app)
            .delete(ListEndpoint.deleteListItem(list.listId, listItem.itemId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(403);
    });

    it("should not allow item deletion if list member without edit permission", async () => {
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
        } satisfies ServiceParams<ListItemService, "Save">;

        await ListActions.Save(list);
        await ListItemActions.Save(listItem);
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
            .delete(ListEndpoint.deleteListItem(list.listId, listItem.itemId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(403);
    });

    it("should allow item deletion if list member with edit permission", async () => {
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
        } satisfies ServiceParams<ListItemService, "Save">;

        await ListActions.Save(list);
        await ListItemActions.Save(listItem);
        await ListMemberActions.save({
            listId: list.listId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Administrator,
                },
            ],
        });

        const res = await request(app)
            .delete(ListEndpoint.deleteListItem(list.listId, listItem.itemId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(201);

        const listItems = await ListItemActions.Read({ listId: list.listId });

        expect(listItems.length).toEqual(0);
    });

    it("should allow deletion if list owner", async () => {
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
        } satisfies ServiceParams<ListItemService, "Save">;

        await ListActions.Save(list);
        await ListItemActions.Save(listItem);

        const res = await request(app)
            .delete(ListEndpoint.deleteListItem(list.listId, listItem.itemId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(201);

        const listItems = await ListItemActions.Read({ listId: list.listId });

        expect(listItems.length).toEqual(0);
    });
});

describe("post list member", () => {
    let app: Express.Application;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).post(ListEndpoint.postListMember(uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existant list", async () => {
        const [token] = await PrepareAuthenticatedUser();

        const res = await request(app).post(ListEndpoint.postListMember(uuid())).set(token).send();

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow editing if not existing list member", async () => {
        const [token] = await PrepareAuthenticatedUser();
        const [listOwner] = await CreateUsers();

        const list = {
            listId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: listOwner!.userId,
        } satisfies ServiceParams<ListService, "Save">;

        await ListActions.Save(list);

        const res = await request(app).post(ListEndpoint.postListMember(list.listId)).set(token).send();

        expect(res.statusCode).toEqual(403);
    });

    it("should allow accepting if existing list member", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const [listOwner] = await CreateUsers();

        const list = {
            listId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: listOwner!.userId,
        } satisfies ServiceParams<ListService, "Save">;

        await ListActions.Save(list);
        await ListMemberActions.save({
            listId: list.listId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Pending,
                },
            ],
        });

        const res = await request(app).post(ListEndpoint.postListMember(list.listId)).set(token).send();

        expect(res.statusCode).toEqual(201);

        const listMembers = await ListMemberActions.read({ entityId: list.listId });

        expect(listMembers.length).toEqual(1);

        const [listMember] = listMembers;

        expect(listMember?.status).toEqual(UserStatus.Member);
        expect(listMember?.userId).toEqual(user.userId);
    });
});

describe("delete list member", () => {
    let app: Express.Application;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).delete(ListEndpoint.deleteListMember(uuid(), uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existant list", async () => {
        const [token] = await PrepareAuthenticatedUser();

        const res = await request(app).delete(ListEndpoint.deleteListMember(uuid(), uuid())).set(token).send();

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deleting member from list where sender has no rights", async () => {
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
            .delete(ListEndpoint.deleteListMember(list.listId, listOwner!.userId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(403);
    });

    it("should not allow leaving a list the user owns", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const list = {
            listId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: user!.userId,
        } satisfies ServiceParams<ListService, "Save">;

        await ListActions.Save(list);

        const res = await request(app)
            .delete(ListEndpoint.deleteListMember(list.listId, user!.userId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(400);
    });

    it("should not allow member removing list owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const [listOwner] = await CreateUsers();

        const list = {
            listId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: listOwner!.userId,
        } satisfies ServiceParams<ListService, "Save">;

        await ListActions.Save(list);
        await ListMemberActions.save({
            listId: list.listId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Administrator,
                },
            ],
        });

        const res = await request(app)
            .delete(ListEndpoint.deleteListMember(list.listId, listOwner!.userId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(403);
    });

    it("should allow removing member if list owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const [listOwner] = await CreateUsers();

        const list = {
            listId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: listOwner!.userId,
        } satisfies ServiceParams<ListService, "Save">;

        await ListActions.Save(list);
        await ListMemberActions.save({
            listId: list.listId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Pending,
                },
            ],
        });

        const res = await request(app)
            .delete(ListEndpoint.deleteListMember(list.listId, user.userId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(201);

        const listMembers = await ListMemberActions.read({ entityId: list.listId });

        expect(listMembers.length).toEqual(0);
    });

    it("should not allow list member with edit permission to remove other member", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const [listOwner, otherMember] = await CreateUsers({ count: 2 });

        const list = {
            listId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: listOwner!.userId,
        } satisfies ServiceParams<ListService, "Save">;

        const listMembers = {
            listId: list.listId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Administrator,
                },
                {
                    userId: otherMember!.userId,
                    status: randomBoolean() ? UserStatus.Administrator : UserStatus.Member,
                },
            ],
        } satisfies ServiceParams<ListMemberActions, "save">;

        await ListActions.Save(list);
        await ListMemberActions.save(listMembers);

        const res = await request(app)
            .delete(ListEndpoint.deleteListMember(list.listId, listMembers.members[1]!.userId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(403);
    });

    it("should allow removing self if list member", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const [listOwner] = await CreateUsers();

        const list = {
            listId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: listOwner!.userId,
        } satisfies ServiceParams<ListService, "Save">;

        await ListActions.Save(list);
        await ListMemberActions.save({
            listId: list.listId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Administrator,
                },
            ],
        });

        const res = await request(app)
            .delete(ListEndpoint.deleteListMember(list.listId, user.userId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(201);
    });
});
