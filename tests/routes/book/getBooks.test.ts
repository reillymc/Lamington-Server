import request from "supertest";

import app from "../../../src/app";
import { BookMemberActions } from "../../../src/controllers";
import { CreateBookMemberParams } from "../../../src/controllers/bookMember";
import { GetBooksResponse, UserStatus } from "../../../src/routes/spec";
import { BookEndpoint, CleanTables, CreateBooks, CreateUsers, PrepareAuthenticatedUser } from "../../helpers";

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
                        status: UserStatus.Administrator,
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
                        status: UserStatus.Member,
                    },
                ],
            })
        ),
        ...nonAcceptedBooks.map(
            ({ bookId }): CreateBookMemberParams => ({
                bookId,
                members: [{ userId: user.userId, status: UserStatus.Pending }],
            })
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
        const { status } = data![bookId]!;

        if (editableBookIds.includes(bookId)) {
            expect(status).toEqual(UserStatus.Administrator);
        } else if (acceptedBookIds.includes(bookId)) {
            expect(status).toEqual(UserStatus.Member);
        } else if (nonAcceptedBookIds.includes(bookId)) {
            expect(status).toEqual(UserStatus.Pending);
        }
    });
});
