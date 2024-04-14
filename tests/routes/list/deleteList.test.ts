import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { ListActions, ListMemberActions } from "../../../src/controllers";
import { ListService } from "../../../src/controllers/spec";
import { ServiceParams } from "../../../src/database";
import { DeleteListRequestParams, UserStatus } from "../../../src/routes/spec";
import { CleanTables, CreateUsers, ListEndpoint, PrepareAuthenticatedUser } from "../../helpers";

beforeEach(async () => {
    await CleanTables("list", "user", "list_member");
});

afterAll(async () => {
    await CleanTables("list", "user", "list_member");
});

test("route should require authentication", async () => {
    const res = await request(app).delete(ListEndpoint.deleteList(uuid()));

    expect(res.statusCode).toEqual(401);
});

test("should return 404 for non-existant list", async () => {
    const [token] = await PrepareAuthenticatedUser();

    const res = await request(app)
        .delete(ListEndpoint.deleteList(uuid()))
        .set(token)
        .send({ listId: uuid() } satisfies DeleteListRequestParams);

    expect(res.statusCode).toEqual(404);
});

test("should not allow deletion if not list owner", async () => {
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

test("should not allow deletion if list member but not list owner", async () => {
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

test("should delete list", async () => {
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
