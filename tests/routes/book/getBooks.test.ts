import request from "supertest";

import app from "../../../src/app";
import { BookEndpoint, CleanTables, CreateBooks, CreateUsers, PrepareAuthenticatedUser } from "../../helpers";
import { GetBooksResponse } from "../../../src/routes/spec";
import { BookMemberActions } from "../../../src/controllers";
import { CreateBookMemberParams } from "../../../src/controllers/bookMember";

beforeEach(async () => {
    await CleanTables("book", "user");
});

afterAll(async () => {
    await CleanTables("book", "user");
});

test("route should require authentication", async () => {
    const res = await request(app).get(BookEndpoint.getBooks);

    expect(res.statusCode).toEqual(401);
});

test("should return only books for current user", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [otherUser] = await CreateUsers({ count: 1 });

    const [_, count] = await CreateBooks({ createdBy: user.userId });
    await CreateBooks({ createdBy: otherUser!.userId });

    const res = await request(app).get(BookEndpoint.getBooks).set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetBooksResponse;

    expect(Object.keys(data ?? {}).length).toEqual(count);
});

test("should return correct book membership details for user", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [otherUser] = await CreateUsers({ count: 1 });

    const [editableBooks] = await CreateBooks({ createdBy: otherUser!.userId });
    const [acceptedBooks] = await CreateBooks({ createdBy: otherUser!.userId });
    const [nonAcceptedBooks] = await CreateBooks({ createdBy: otherUser!.userId });

    await BookMemberActions.save([
        ...editableBooks.map(
            ({ bookId }): CreateBookMemberParams => ({
                bookId,
                members: [
                    {
                        userId: user.userId,
                        allowEditing: true,
                        accepted: true,
                    },
                ],
            })
        ),
        ...acceptedBooks.map(
            ({ bookId }): CreateBookMemberParams => ({
                bookId,
                members: [
                    {
                        userId: user.userId,
                        allowEditing: false,
                        accepted: true,
                    },
                ],
            })
        ),
        ...nonAcceptedBooks.map(
            ({ bookId }): CreateBookMemberParams => ({ bookId, members: [{ userId: user.userId, accepted: false }] })
        ),
    ]);

    const res = await request(app).get(BookEndpoint.getBooks).set(token);

    expect(res.statusCode).toEqual(200);

    const { data } = res.body as GetBooksResponse;

    expect(Object.keys(data ?? {}).length).toEqual(
        editableBooks.length + acceptedBooks.length + nonAcceptedBooks.length
    );

    const editableBookIds = editableBooks.map(({ bookId }) => bookId);
    const acceptedBookIds = acceptedBooks.map(({ bookId }) => bookId);
    const nonAcceptedBookIds = nonAcceptedBooks.map(({ bookId }) => bookId);

    Object.keys(data ?? {}).forEach(bookId => {
        const { canEdit, accepted } = data![bookId]!;

        if (editableBookIds.includes(bookId)) {
            expect(canEdit).toEqual(true);
            expect(accepted).toEqual(true);
        } else if (acceptedBookIds.includes(bookId)) {
            expect(canEdit).toEqual(false);
            expect(accepted).toEqual(true);
        } else if (nonAcceptedBookIds.includes(bookId)) {
            expect(canEdit).toEqual(false);
            expect(accepted).toEqual(false);
        }
    });
});
