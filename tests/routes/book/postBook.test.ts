import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { BookActions, BookMemberActions } from "../../../src/controllers";
import { EntityMember } from "../../../src/controllers/entity";
import { ServiceParams } from "../../../src/database";
import { parseBookCustomisations } from "../../../src/routes/helpers";
import { PostBookRequestBody, UserStatus } from "../../../src/routes/spec";
import {
    BookEndpoint,
    CleanTables,
    CreateUsers,
    PrepareAuthenticatedUser,
    randomBoolean,
    randomCount,
    randomNumber,
} from "../../helpers";

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

test("should not allow editing if not book owner", async () => {
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
        .post(BookEndpoint.postBook)
        .set(token)
        .send({ data: { bookId: book.bookId, name: "book" } } satisfies PostBookRequestBody);

    expect(res.statusCode).toEqual(403);
});

test("should not allow editing if book member but not book owner", async () => {
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

    const res = await request(app)
        .post(BookEndpoint.postBook)
        .set(token)
        .send({ data: { bookId: book.bookId, name: "book" } } satisfies PostBookRequestBody);

    expect(res.statusCode).toEqual(403);
});

test("should create book", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const users = await CreateUsers();

    const books = {
        data: Array.from({ length: randomNumber() }).map((_, i) => ({
            bookId: uuid(),
            name: uuid(),
            description: uuid(),
            color: uuid(),
            icon: uuid(),
            members: users!.map(({ userId }) => ({
                userId,
                status: randomBoolean() ? UserStatus.Administrator : UserStatus.Registered,
            })),
        })),
    } satisfies PostBookRequestBody;

    const res = await request(app).post(BookEndpoint.postBook).set(token).send(books);

    expect(res.statusCode).toEqual(201);

    const savedBooks = await BookActions.readMy({ userId: user.userId });

    expect(savedBooks.length).toEqual(books.data.length);

    expect(savedBooks.length).toEqual(books.data.length);

    const savedBookMembers = await BookMemberActions.read(savedBooks.map(({ bookId }) => ({ entityId: bookId })));

    for (const book of savedBooks) {
        const expectedBook = books.data.find(({ bookId }) => bookId === book.bookId);
        const actualBookMembers = savedBookMembers.filter(({ bookId }) => bookId === book.bookId);

        const { color, icon } = parseBookCustomisations(book.customisations);

        expect(book?.name).toEqual(expectedBook!.name);
        expect(book?.description).toEqual(expectedBook!.description);
        expect(color).toEqual(expectedBook!.color);
        expect(icon).toEqual(expectedBook!.icon);
        expect(book?.createdBy).toEqual(user.userId);
        expect(actualBookMembers.length).toEqual(expectedBook!.members.length);

        for (const { userId, status } of expectedBook!.members) {
            const savedBookMember = actualBookMembers.find(({ userId: savedUserId }) => savedUserId === userId);

            expect(savedBookMember).toBeTruthy();

            expect(savedBookMember?.canEdit).toEqual(status);
        }
    }
});

test("should save updated book details as book owner", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const book = {
        bookId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user.userId,
    } satisfies ServiceParams<BookActions, "save">;

    await BookActions.save(book);

    const updatedBook = {
        data: {
            bookId: book.bookId,
            name: uuid(),
            description: uuid(),
        },
    } satisfies PostBookRequestBody;

    const res = await request(app).post(BookEndpoint.postBook).set(token).send(updatedBook);

    expect(res.statusCode).toEqual(201);

    const [savedBook] = await BookActions.read({ bookId: book.bookId, userId: user.userId });

    expect(savedBook?.name).toEqual(updatedBook.data.name);
    expect(savedBook?.description).toEqual(updatedBook.data.description);
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
        bookId: uuid(),
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
        .send({ data: { ...book, members: allMembers } } satisfies PostBookRequestBody);

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
        bookId: uuid(),
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
        .send({ data: { ...book, members: reducedMembers } } satisfies PostBookRequestBody);

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
        bookId: uuid(),
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
        .send({ data: { ...book, members: [] } } satisfies PostBookRequestBody);

    expect(res.statusCode).toEqual(201);

    const savedBookMembers = await BookMemberActions.read({ entityId: book!.bookId });

    expect(savedBookMembers.length).toEqual(0);
});
