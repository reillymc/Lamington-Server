import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { BookEndpoint, CleanTables, CreateUsers, PrepareAuthenticatedUser } from "../../helpers";
import { BookActions, BookMemberActions } from "../../../src/controllers";
import { CreateBookParams } from "../../../src/controllers/book";
import { DeleteBookRequestParams } from "../../../src/routes/spec";

beforeEach(async () => {
    await CleanTables("book", "user", "book_member");
});

afterAll(async () => {
    await CleanTables("book", "user", "book_member");
});

test("route should require authentication", async () => {
    const res = await request(app).delete(BookEndpoint.deleteBook(uuid()));

    expect(res.statusCode).toEqual(401);
});

test("should return 404 for non-existant book", async () => {
    const [token] = await PrepareAuthenticatedUser();

    const res = await request(app)
        .delete(BookEndpoint.deleteBook(uuid()))
        .set(token)
        .send({ bookId: uuid() } satisfies DeleteBookRequestParams);

    expect(res.statusCode).toEqual(404);
});

test("should not allow deletion if not book owner", async () => {
    const [token] = await PrepareAuthenticatedUser();
    const [bookOwner] = await CreateUsers();

    const book = {
        bookId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: bookOwner!.userId,
    } satisfies CreateBookParams;

    await BookActions.save(book);

    const res = await request(app)
        .delete(BookEndpoint.deleteBook(book.bookId))
        .set(token)
        .send({ bookId: book.bookId } satisfies DeleteBookRequestParams);

    expect(res.statusCode).toEqual(404);
});

test("should not allow deletion if book member but not book owner", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [bookOwner] = await CreateUsers();

    const book = {
        bookId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: bookOwner!.userId,
    } satisfies CreateBookParams;

    await BookActions.save(book);
    await BookMemberActions.save({
        bookId: book.bookId,
        members: [
            {
                userId: user!.userId,
                accepted: true,
                allowEditing: true,
            },
        ],
    });

    const res = await request(app)
        .delete(BookEndpoint.deleteBook(book.bookId))
        .set(token)
        .send({ bookId: book.bookId } satisfies DeleteBookRequestParams);

    expect(res.statusCode).toEqual(404);
});

test("should delete book", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const book = {
        bookId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user!.userId,
    } satisfies CreateBookParams;

    await BookActions.save(book);

    const res = await request(app).delete(BookEndpoint.deleteBook(book.bookId)).set(token).send(book);

    expect(res.statusCode).toEqual(201);

    const books = await BookActions.read({ bookId: book.bookId, userId: user.userId });

    expect(books.length).toEqual(0);
});
