import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { BookEndpoint, CleanTables, CreateUsers, PrepareAuthenticatedUser } from "../../helpers";
import { BookActions, BookMemberActions } from "../../../src/controllers";
import { CreateBookParams } from "../../../src/controllers/book";
import { PostBookRequestBody } from "../../../src/routes/spec";

beforeEach(async () => {
    await CleanTables("book", "user", "book_member");
});

afterAll(async () => {
    await CleanTables("book", "user", "book_member");
});

test("route should require authentication", async () => {
    const res = await request(app).post(BookEndpoint.postBook);

    expect(res.statusCode).toEqual(401);
});

test("should return 404 for non-existant book", async () => {
    const [token] = await PrepareAuthenticatedUser();

    const res = await request(app)
        .post(BookEndpoint.postBook)
        .set(token)
        .send({ bookId: uuid(), name: "book" } as PostBookRequestBody);

    expect(res.statusCode).toEqual(404);
});

test("should not allow editing if not book owner", async () => {
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
        .post(BookEndpoint.postBook)
        .set(token)
        .send({ bookId: book.bookId, name: "book" } as PostBookRequestBody);

    expect(res.statusCode).toEqual(404);
});

test("should not allow editing if book member but not book owner", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [bookOwner] = await CreateUsers();

    const book = {
        bookId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: bookOwner!.userId,
    } satisfies CreateBookParams;

    await BookActions.save(book);
    await BookMemberActions.update({
        entityId: book.bookId,
        userId: user!.userId,
        accepted: true,
        allowEditing: true,
    });

    const res = await request(app)
        .post(BookEndpoint.postBook)
        .set(token)
        .send({ bookId: book.bookId, name: "book" } as PostBookRequestBody);

    expect(res.statusCode).toEqual(404);
});

test("should create book", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const book = {
        name: uuid(),
        description: uuid(),
    } satisfies Partial<PostBookRequestBody>;

    const res = await request(app).post(BookEndpoint.postBook).set(token).send(book);

    expect(res.statusCode).toEqual(201);

    const savedBooks = await BookActions.readMy({ userId: user.userId });

    expect(savedBooks.length).toEqual(1);

    const [savedBook] = savedBooks;

    expect(savedBook?.name).toEqual(book.name);
    expect(savedBook?.description).toEqual(book.description);
    expect(savedBook?.createdBy).toEqual(user.userId);
});

test("should save updated book details", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const book = {
        bookId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user.userId,
    } satisfies CreateBookParams;

    await BookActions.save(book);

    const updatedBook: Partial<PostBookRequestBody> = {
        bookId: book.bookId,
        name: uuid(),
        description: uuid(),
    };

    const res = await request(app).post(BookEndpoint.postBook).set(token).send(updatedBook);

    expect(res.statusCode).toEqual(201);

    const [savedBook] = await BookActions.read({ bookId: book.bookId, userId: user.userId });

    expect(savedBook?.name).toEqual(updatedBook.name);
    expect(savedBook?.description).toEqual(updatedBook.description);
    expect(savedBook?.bookId).toEqual(book.bookId);
    expect(savedBook?.createdBy).toEqual(book.createdBy);
});
