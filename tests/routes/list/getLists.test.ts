import request from "supertest";

import app from "../../../src/app";
import { ListEndpoint, CleanTables, CreateLists, CreateUsers, PrepareAuthenticatedUser } from "../../helpers";
import { GetListsResponse } from "../../../src/routes/spec";
import { ListMemberActions } from "../../../src/controllers";
import { CreateListMemberParams } from "../../../src/controllers/listMember";

beforeEach(async () => {
    await CleanTables("list", "user");
});

afterAll(async () => {
    await CleanTables("list", "user");
});

test("route should require authentication", async () => {
    const res = await request(app).get(ListEndpoint.getLists);

    expect(res.statusCode).toEqual(401);
});

test("should return only lists for current user", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [otherUser] = await CreateUsers({ count: 1 });

    const [_, count] = await CreateLists({ createdBy: user.userId });
    await CreateLists({ createdBy: otherUser!.userId });

    const res = await request(app).get(ListEndpoint.getLists).set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetListsResponse;

    expect(Object.keys(data ?? {}).length).toEqual(count);
});

test("should return correct list membership details for user", async () => {
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
                        allowEditing: true,
                        accepted: true,
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
                        allowEditing: false,
                        accepted: true,
                    },
                ],
            })
        ),
        ...nonAcceptedLists.map(
            ({ listId }): CreateListMemberParams => ({ listId, members: [{ userId: user.userId, accepted: false }] })
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
        const { canEdit, accepted } = data![listId]!;

        if (editableListIds.includes(listId)) {
            expect(canEdit).toEqual(true);
            expect(accepted).toEqual(true);
        } else if (acceptedListIds.includes(listId)) {
            expect(canEdit).toEqual(false);
            expect(accepted).toEqual(true);
        } else if (nonAcceptedListIds.includes(listId)) {
            expect(canEdit).toEqual(false);
            expect(accepted).toEqual(false);
        }
    });
});
