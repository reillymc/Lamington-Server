import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import {
    ListEndpoint,
    CleanTables,
    CreateUsers,
    PrepareAuthenticatedUser,
    randomBoolean,
    randomCount,
    randomNumber,
} from "../../helpers";
import { ListActions, ListMemberActions } from "../../../src/controllers";
import { PostListRequestBody } from "../../../src/routes/spec";
import { EntityMember } from "../../../src/controllers/entity";
import { ServiceParams } from "../../../src/database";
import { parseListCustomisations } from "../../../src/routes/helpers/list";
import { ListService } from "../../../src/controllers/spec";

beforeEach(async () => {
    await CleanTables("list", "user", "list_member");
});

afterAll(async () => {
    await CleanTables("list", "user", "list_member");
});

test("route should require authentication", async () => {
    const res = await request(app).post(ListEndpoint.postList);

    expect(res.statusCode).toEqual(401);
});

test("should not allow editing if not list owner", async () => {
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

test("should not allow editing if list member but not list owner", async () => {
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
                accepted: true,
                allowEditing: true,
            },
        ],
    });

    const res = await request(app)
        .post(ListEndpoint.postList)
        .set(token)
        .send({ data: { listId: list.listId, name: "list" } } satisfies PostListRequestBody);

    expect(res.statusCode).toEqual(403);
});

test("should create list", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const users = await CreateUsers();

    const lists = {
        data: Array.from({ length: randomNumber() }).map((_, i) => ({
            listId: uuid(),
            name: uuid(),
            icon: uuid(),
            description: uuid(),
            members: users!.map(({ userId }) => ({ userId, allowEditing: randomBoolean() })),
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

        const { icon } = parseListCustomisations(list.customisations);

        expect(list?.name).toEqual(expectedList!.name);
        expect(list?.description).toEqual(expectedList!.description);
        expect(icon).toEqual(expectedList!.icon);
        expect(list?.createdBy).toEqual(user.userId);
        expect(actualListMembers.length).toEqual(expectedList!.members.length);

        for (const { userId, allowEditing } of expectedList!.members) {
            const savedListMember = actualListMembers.find(({ userId: savedUserId }) => savedUserId === userId);

            expect(savedListMember).toBeTruthy();

            expect(savedListMember?.canEdit).toEqual(allowEditing ? 1 : 0);
        }
    }
});

test("should save updated list details as list owner", async () => {
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

test("should save additional list members", async () => {
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

test("should remove some list members", async () => {
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

test("should remove all list members", async () => {
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
