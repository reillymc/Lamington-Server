import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { ListEndpoint, CleanTables, CreateUsers, PrepareAuthenticatedUser } from "../../helpers";
import { ListActions, ListMemberActions } from "../../../src/controllers";
import { PostListMemberRequestBody } from "../../../src/routes/spec";
import { ServiceParams } from "../../../src/database";

beforeEach(async () => {
    await CleanTables("list", "user", "list_member");
});

afterAll(async () => {
    await CleanTables("list", "user", "list_member");
});

test("route should require authentication", async () => {
    const res = await request(app).post(ListEndpoint.postListMember(uuid()));

    expect(res.statusCode).toEqual(401);
});

test("should return 404 for non-existant list", async () => {
    const [token] = await PrepareAuthenticatedUser();

    const res = await request(app)
        .post(ListEndpoint.postListMember(uuid()))
        .set(token)
        .send({ accepted: true } satisfies PostListMemberRequestBody);

    expect(res.statusCode).toEqual(404);
});

test("should not allow editing if not existing list member", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [listOwner] = await CreateUsers();

    const list = {
        listId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: listOwner!.userId,
    } satisfies ServiceParams<ListActions, "save">;

    await ListActions.save(list);

    const res = await request(app)
        .post(ListEndpoint.postListMember(list.listId))
        .set(token)
        .send({ accepted: true } satisfies PostListMemberRequestBody);

    expect(res.statusCode).toEqual(403);
});

test("should allow accepting if existing list member", async () => {
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

    const res = await request(app)
        .post(ListEndpoint.postListMember(list.listId))
        .set(token)
        .send({ accepted: true } satisfies PostListMemberRequestBody);

    expect(res.statusCode).toEqual(201);

    const listMembers = await ListMemberActions.read({ entityId: list.listId });

    expect(listMembers.length).toEqual(1);

    const [listMember] = listMembers;

    expect(listMember?.accepted).toEqual(1);
    expect(listMember?.canEdit).toEqual(0);
    expect(listMember?.userId).toEqual(user.userId);
});
