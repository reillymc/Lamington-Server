import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { ListActions, ListMemberActions } from "../../../src/controllers";
import { ListService } from "../../../src/controllers/spec";
import { ServiceParams } from "../../../src/database";
import { UserStatus } from "../../../src/routes/spec";
import { CleanTables, CreateUsers, ListEndpoint, PrepareAuthenticatedUser } from "../../helpers";

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

    const res = await request(app).post(ListEndpoint.postListMember(uuid())).set(token).send();

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
    } satisfies ServiceParams<ListService, "Save">;

    await ListActions.Save(list);

    const res = await request(app).post(ListEndpoint.postListMember(list.listId)).set(token).send();

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

    expect(listMember?.status).toEqual(UserStatus.Registered);
    expect(listMember?.userId).toEqual(user.userId);
});
