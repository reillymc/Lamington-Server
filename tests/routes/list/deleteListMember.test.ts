import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { ListActions, ListMemberActions } from "../../../src/controllers";
import { ListService } from "../../../src/controllers/spec";
import { ServiceParams } from "../../../src/database";
import { UserStatus } from "../../../src/routes/spec";
import { CreateUsers, ListEndpoint, PrepareAuthenticatedUser, randomBoolean } from "../../helpers";

test("route should require authentication", async () => {
    const res = await request(app).delete(ListEndpoint.deleteListMember(uuid(), uuid()));

    expect(res.statusCode).toEqual(401);
});

test("should return 404 for non-existant list", async () => {
    const [token] = await PrepareAuthenticatedUser();

    const res = await request(app).delete(ListEndpoint.deleteListMember(uuid(), uuid())).set(token).send();

    expect(res.statusCode).toEqual(404);
});

test("should not allow deleting member from list where sender has no rights", async () => {
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

test("should not allow leaving a list the user owns", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const list = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user!.userId,
    } satisfies ServiceParams<ListService, "Save">;

    await ListActions.Save(list);

    const res = await request(app).delete(ListEndpoint.deleteListMember(list.listId, user!.userId)).set(token).send();

    expect(res.statusCode).toEqual(400);
});

test("should not allow member removing list owner", async () => {
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

test("should allow removing member if list owner", async () => {
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

    const res = await request(app).delete(ListEndpoint.deleteListMember(list.listId, user.userId)).set(token).send();

    expect(res.statusCode).toEqual(201);

    const listMembers = await ListMemberActions.read({ entityId: list.listId });

    expect(listMembers.length).toEqual(0);
});

test("should not allow list member with edit permission to remove other member", async () => {
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

test("should allow removing self if list member", async () => {
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

    const res = await request(app).delete(ListEndpoint.deleteListMember(list.listId, user.userId)).set(token).send();

    expect(res.statusCode).toEqual(201);
});
