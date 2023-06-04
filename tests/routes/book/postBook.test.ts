import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import {
    BookEndpoint,
    CleanTables,
    CreateUsers,
    PrepareAuthenticatedUser,
    randomBoolean,
    randomCount,
} from "../../helpers";
import { BookActions, BookMemberActions } from "../../../src/controllers";
import { CreateBookParams } from "../../../src/controllers/book";
import { PostBookRequestBody } from "../../../src/routes/spec";
import { EntityMember } from "../../../src/controllers/entity";

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
        .post(BookEndpoint.postBook)
        .set(token)
        .send({ bookId: book.bookId, name: "book" } as PostBookRequestBody);

    expect(res.statusCode).toEqual(404);
});

test("should create book", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const users = await CreateUsers();

    const book = {
        name: uuid(),
        description: uuid(),
        members: users!.map(({ userId }) => ({ userId, allowEditing: randomBoolean })),
    } satisfies Partial<PostBookRequestBody>;

    const res = await request(app).post(BookEndpoint.postBook).set(token).send(book);

    expect(res.statusCode).toEqual(201);

    const savedBooks = await BookActions.readMy({ userId: user.userId });

    expect(savedBooks.length).toEqual(1);

    const [savedBook] = savedBooks;
    const savedBookMembers = await BookMemberActions.read({ entityId: savedBook!.bookId });

    expect(savedBook?.name).toEqual(book.name);
    expect(savedBook?.description).toEqual(book.description);
    expect(savedBook?.createdBy).toEqual(user.userId);
    expect(savedBookMembers.length).toEqual(book.members!.length);

    for (const { userId, allowEditing } of book.members!) {
        const savedBookMember = savedBookMembers.find(({ userId: savedUserId }) => savedUserId === userId);

        expect(savedBookMember).toBeTruthy();

        expect(savedBookMember?.canEdit).toEqual(allowEditing ? 1 : 0);
    }
});

test("should save updated book details as book owner", async () => {
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

test("should save additional book members", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const initialUsers = await CreateUsers({ count: randomCount });
    const additionalUsers = await CreateUsers({ count: randomCount });

    const initialMembers: EntityMember[] = initialUsers.map(({ userId }) => ({ userId }));
    const additionalMembers: EntityMember[] = additionalUsers.map(({ userId }) => ({ userId }));
    const allMembers = [...initialMembers, ...additionalMembers];

    const [book] = await BookActions.save({
        createdBy: user.userId,
        name: uuid(),
        description: uuid(),
        members: initialMembers,
    });

    const initialBookMembers = await BookMemberActions.read({ entityId: book!.bookId });
    expect(initialBookMembers.length).toEqual(initialMembers.length);

    const res = await request(app)
        .post(BookEndpoint.postBook)
        .set(token)
        .send({ ...book, members: allMembers } as Partial<PostBookRequestBody>);

    expect(res.statusCode).toEqual(201);

    const savedBookMembers = await BookMemberActions.read({ entityId: book!.bookId });

    expect(savedBookMembers.length).toEqual(allMembers.length);

    savedBookMembers.forEach(({ userId }) => {
        const savedBookMember = allMembers.find(({ userId: savedUserId }) => savedUserId === userId);

        expect(savedBookMember).toBeTruthy();
    });
});

test("should remove some book members", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const initialMembers = await CreateUsers({ count: randomCount });

    const members: EntityMember[] = initialMembers.map(({ userId }) => ({ userId }));
    const reducedMembers: EntityMember[] = members.slice(0, Math.max((members.length - 1) / 2));
    const excludedMembers: EntityMember[] = members.filter(
        ({ userId }) => !reducedMembers.find(({ userId: savedUserId }) => savedUserId === userId)
    );

    const [book] = await BookActions.save({
        createdBy: user.userId,
        name: uuid(),
        description: uuid(),
        members,
    });

    const initialBookMembers = await BookMemberActions.read({ entityId: book!.bookId });
    expect(initialBookMembers.length).toEqual(members.length);
    const res = await request(app)
        .post(BookEndpoint.postBook)
        .set(token)
        .send({ ...book, members: reducedMembers } as Partial<PostBookRequestBody>);

    expect(res.statusCode).toEqual(201);

    const updatedBookMembers = await BookMemberActions.read({ entityId: book!.bookId });
    expect(updatedBookMembers.length).toEqual(reducedMembers.length);

    updatedBookMembers.forEach(({ userId }) => {
        const savedBookMember = reducedMembers.find(({ userId: savedUserId }) => savedUserId === userId);
        const illegalMember = excludedMembers.some(({ userId: savedUserId }) => savedUserId === userId);

        expect(savedBookMember).toBeTruthy();
        expect(illegalMember).toBeFalsy();
    });
});

test("should remove all book members", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const members = await CreateUsers({ count: randomCount });

    const [book] = await BookActions.save({
        createdBy: user.userId,
        name: uuid(),
        description: uuid(),
        members: members.map(({ userId }) => ({ userId })),
    });

    const initialBookMembers = await BookMemberActions.read({ entityId: book!.bookId });
    expect(initialBookMembers.length).toEqual(members.length);

    const res = await request(app)
        .post(BookEndpoint.postBook)
        .set(token)
        .send({ ...book, members: [] } as Partial<PostBookRequestBody>);

    expect(res.statusCode).toEqual(201);

    const savedBookMembers = await BookMemberActions.read({ entityId: book!.bookId });

    expect(savedBookMembers.length).toEqual(0);
});
