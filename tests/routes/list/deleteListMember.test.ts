import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { ListEndpoint, CleanTables, CreateUsers, PrepareAuthenticatedUser, randomBoolean } from "../../helpers";
import { ListActions, ListMemberActions } from "../../../src/controllers";
import { ServiceParams } from "../../../src/database";

beforeEach(async () => {
    await CleanTables("list", "user", "list_member");
});

afterAll(async () => {
    await CleanTables("list", "user", "list_member");
});

test("route should require authentication", async () => {
    const res = await request(app).delete(ListEndpoint.deleteListMember(uuid(), uuid()));

    expect(res.statusCode).toEqual(401);
});

test("should return 404 for non-existant list", async () => {
    const [token] = await PrepareAuthenticatedUser();

    const res = await request(app).delete(ListEndpoint.deleteListMember(uuid(), uuid())).set(token).send();

    expect(res.statusCode).toEqual(404);
});

test("should not allow leaving a list the user owns", async () => {
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
        .delete(ListEndpoint.deleteListMember(list.listId, listOwner!.userId))
        .set(token)
        .send();

    expect(res.statusCode).toEqual(400);
});

test("should allow removing member if list owner", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [listOwner] = await CreateUsers();

    const list = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: listOwner!.userId,
    } satisfies ServiceParams<ListActions, "save">;

    await ListActions.save(list);
    await ListMemberActions.save({
        listId: list.listId,
        members: [
            {
                userId: user!.userId,
                accepted: false,
                allowEditing: false,
            },
        ],
    });

    const res = await request(app).delete(ListEndpoint.deleteListMember(list.listId, user.userId)).set(token).send();

    expect(res.statusCode).toEqual(201);

    const listMembers = await ListMemberActions.read({ entityId: list.listId });

    expect(listMembers.length).toEqual(0);
});

test("should not allow removing other member if list member with edit permission", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [listOwner, otherMember] = await CreateUsers({ count: 2 });

    const list = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: listOwner!.userId,
    } satisfies ServiceParams<ListActions, "save">;

    const listMembers = {
        listId: list.listId,
        members: [
            {
                userId: user!.userId,
                accepted: true,
                allowEditing: true,
            },
            {
                userId: otherMember!.userId,
                accepted: true,
                allowEditing: randomBoolean(),
            },
        ],
    } satisfies ServiceParams<ListMemberActions, "save">;

    await ListActions.save(list);
    await ListMemberActions.save(listMembers);

    const res = await request(app)
        .delete(ListEndpoint.deleteListMember(list.listId, listMembers.members[1]!.userId))
        .set(token)
        .send();

    expect(res.statusCode).toEqual(403);
});

test("should allow removing self if list member", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [listOwner] = await CreateUsers();

    const list = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: listOwner!.userId,
    } satisfies ServiceParams<ListActions, "save">;

    await ListActions.save(list);
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

    const res = await request(app).delete(ListEndpoint.deleteListMember(list.listId, user.userId)).set(token).send();

    expect(res.statusCode).toEqual(201);
});
