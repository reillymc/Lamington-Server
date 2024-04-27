import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { BookActions, BookMemberActions } from "../../../src/controllers";
import { ServiceParams } from "../../../src/database";
import { UserStatus } from "../../../src/routes/spec";
import { BookEndpoint, CreateUsers, PrepareAuthenticatedUser, randomBoolean } from "../../helpers";

test("route should require authentication", async () => {
    const res = await request(app).delete(BookEndpoint.deleteBookMember(uuid(), uuid()));

    expect(res.statusCode).toEqual(401);
});

test("should return 404 for non-existant book", async () => {
    const [token] = await PrepareAuthenticatedUser();

    const res = await request(app).delete(BookEndpoint.deleteBookMember(uuid(), uuid())).set(token).send();

    expect(res.statusCode).toEqual(404);
});

test("should not allow leaving a book the user owns", async () => {
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
        .delete(BookEndpoint.deleteBookMember(book.bookId, bookOwner!.userId))
        .set(token)
        .send();

    expect(res.statusCode).toEqual(400);
});

test("should allow removing member if book owner", async () => {
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
                status: UserStatus.Pending,
            },
        ],
    });

    const res = await request(app).delete(BookEndpoint.deleteBookMember(book.bookId, user.userId)).set(token).send();

    expect(res.statusCode).toEqual(201);

    const bookMembers = await BookMemberActions.read({ entityId: book.bookId });

    expect(bookMembers.length).toEqual(0);
});

test("should not allow removing other member if book member with edit permission", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [bookOwner, otherMember] = await CreateUsers({ count: 2 });

    const book = {
        bookId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: bookOwner!.userId,
    } satisfies ServiceParams<BookActions, "save">;

    const bookMembers = {
        bookId: book.bookId,
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
    } satisfies ServiceParams<BookMemberActions, "save">;

    await BookActions.save(book);
    await BookMemberActions.save(bookMembers);

    const res = await request(app)
        .delete(BookEndpoint.deleteBookMember(book.bookId, bookMembers.members[1]!.userId))
        .set(token)
        .send();

    expect(res.statusCode).toEqual(403);
});

test("should allow removing self if book member", async () => {
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
                status: UserStatus.Administrator,
            },
        ],
    });

    const res = await request(app).delete(BookEndpoint.deleteBookMember(book.bookId, user.userId)).set(token).send();

    expect(res.statusCode).toEqual(201);
});
