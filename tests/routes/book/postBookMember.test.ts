import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { BookEndpoint, CleanTables, CreateUsers, PrepareAuthenticatedUser } from "../../helpers";
import { BookActions, BookMemberActions } from "../../../src/controllers";
import { PostBookMemberRequestBody } from "../../../src/routes/spec";
import { ServiceParams } from "../../../src/database";

beforeEach(async () => {
    await CleanTables("book", "user", "book_member");
});

afterAll(async () => {
    await CleanTables("book", "user", "book_member");
});

test("route should require authentication", async () => {
    const res = await request(app).post(BookEndpoint.postBookMember(uuid()));

    expect(res.statusCode).toEqual(401);
});

test("should return 404 for non-existant book", async () => {
    const [token] = await PrepareAuthenticatedUser();

    const res = await request(app)
        .post(BookEndpoint.postBookMember(uuid()))
        .set(token)
        .send({ accepted: true } satisfies PostBookMemberRequestBody);

    expect(res.statusCode).toEqual(404);
});

test("should not allow editing if not existing book member", async () => {
    const [token] = await PrepareAuthenticatedUser();
    const [bookOwner] = await CreateUsers();

    const book = {
        bookId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: bookOwner!.userId,
    } satisfies ServiceParams<BookActions, "save">;

    await BookActions.save(book);

    const res = await request(app)
        .post(BookEndpoint.postBookMember(book.bookId))
        .set(token)
        .send({ accepted: true } satisfies PostBookMemberRequestBody);

    expect(res.statusCode).toEqual(403);
});

test("should allow accepting if existing book member", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [bookOwner] = await CreateUsers();

    const book = {
        bookId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: bookOwner!.userId,
    } satisfies ServiceParams<BookActions, "save">;

    await BookActions.save(book);
    await BookMemberActions.save({
        bookId: book.bookId,
        members: [
            {
                userId: user!.userId,
                accepted: false,
                allowEditing: false,
            },
        ],
    });

    const res = await request(app)
        .post(BookEndpoint.postBookMember(book.bookId))
        .set(token)
        .send({ accepted: true } satisfies PostBookMemberRequestBody);

    expect(res.statusCode).toEqual(201);

    const bookMembers = await BookMemberActions.read({ entityId: book.bookId });

    expect(bookMembers.length).toEqual(1);

    const [bookMember] = bookMembers;

    expect(bookMember?.accepted).toEqual(1);
    expect(bookMember?.canEdit).toEqual(0);
    expect(bookMember?.userId).toEqual(user.userId);
});
