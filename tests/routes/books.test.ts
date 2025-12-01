import { expect } from "expect";
import type { Express } from "express";
import { afterEach, beforeEach, describe, it } from "node:test";
import request from "supertest";
import { v4 as uuid } from "uuid";
import type { Knex } from "knex";

import { setupApp } from "../../src/app.ts";
import db, { type KnexDatabase } from "../../src/database/index.ts";
import { KnexBookRepository } from "../../src/repositories/knex/bookRepository.ts";
import { KnexRecipeRepository } from "../../src/repositories/knex/recipeRepository.ts";
import {
    type DeleteBookRequestParams,
    type GetBookResponse,
    type GetBooksResponse,
    type PostBookRecipeRequestBody,
    type PostBookRequestBody,
    type PutBookRequestBody,
    type PostBookResponse,
    type GetBookRecipesResponse,
} from "../../src/routes/spec/book.ts";
import { UserStatus } from "../../src/routes/spec/user.ts";
import type { EntityMember } from "../../src/routes/spec/common.ts";
import {
    BookEndpoint,
    CreateBooks,
    CreateUsers,
    PrepareAuthenticatedUser,
    randomBoolean,
    randomCount,
    randomNumber,
} from "../helpers/index.ts";

describe("get all books", () => {
    let database: KnexDatabase;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).get(BookEndpoint.getBooks);

        expect(res.statusCode).toEqual(401);
    });

    it("should return only books for current user", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database, { count: 1 });

        const [_, count] = await CreateBooks(database, user);
        await CreateBooks(database, otherUser!);

        const res = await request(app).get(BookEndpoint.getBooks).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetBooksResponse;

        expect(Object.keys(data ?? {}).length).toEqual(count);
    });

    it("should return correct book membership details for user", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [otherUser] = await CreateUsers(database, { count: 1 });

        const [editableBooks] = await CreateBooks(database, otherUser!);
        const [acceptedBooks] = await CreateBooks(database, otherUser!);
        const [nonAcceptedBooks] = await CreateBooks(database, otherUser!);

        await KnexBookRepository.saveMembers(database, [
            ...editableBooks.map(({ bookId }) => ({
                bookId,
                members: [
                    {
                        userId: user.userId,
                        status: UserStatus.Administrator,
                    },
                ],
            })),
            ...acceptedBooks.map(({ bookId }) => ({
                bookId,
                members: [
                    {
                        userId: user.userId,
                        status: UserStatus.Member,
                    },
                ],
            })),
            ...nonAcceptedBooks.map(({ bookId }) => ({
                bookId,
                members: [{ userId: user.userId, status: UserStatus.Pending }],
            })),
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

        data!.forEach(({ bookId, status }) => {
            if (editableBookIds.includes(bookId)) {
                expect(status).toEqual(UserStatus.Administrator);
            } else if (acceptedBookIds.includes(bookId)) {
                expect(status).toEqual(UserStatus.Member);
            } else if (nonAcceptedBookIds.includes(bookId)) {
                expect(status).toEqual(UserStatus.Pending);
            }
        });
    });
});

describe("delete book", () => {
    let database: Knex.Transaction;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).delete(BookEndpoint.deleteBook(uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent book", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .delete(BookEndpoint.deleteBook(uuid()))
            .set(token)
            .send({ bookId: uuid() } satisfies DeleteBookRequestParams);

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if not book owner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .delete(BookEndpoint.deleteBook(book!.bookId))
            .set(token)
            .send({ bookId: book!.bookId } satisfies DeleteBookRequestParams);

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if book member but not book owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Administrator,
                },
            ],
        });

        const res = await request(app)
            .delete(BookEndpoint.deleteBook(book!.bookId))
            .set(token)
            .send({ bookId: book!.bookId } satisfies DeleteBookRequestParams);

        expect(res.statusCode).toEqual(404);
    });

    it("should delete book", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: user!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app).delete(BookEndpoint.deleteBook(book!.bookId)).set(token).send(book);

        expect(res.statusCode).toEqual(204);

        const { books } = await KnexBookRepository.read(database, { userId: user.userId, books: [book!] });

        expect(books.length).toEqual(0);
    });
});

describe("delete book member", () => {
    let database: Knex.Transaction;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).delete(BookEndpoint.deleteBookMember(uuid(), uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent book", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app).delete(BookEndpoint.deleteBookMember(uuid(), uuid())).set(token).send();

        expect(res.statusCode).toEqual(404);
    });

    it("should allow book owner to remove member", async () => {
        const [token, bookOwner] = await PrepareAuthenticatedUser(database);
        const [user] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [{ userId: user!.userId, status: UserStatus.Pending }],
        });

        const res = await request(app)
            .delete(BookEndpoint.deleteBookMember(book!.bookId, user!.userId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(204);

        const {
            books: [savedBook],
        } = await KnexBookRepository.read(database, {
            userId: bookOwner!.userId,
            books: [book!],
        });

        expect(savedBook!.members!.length).toEqual(0);
    });

    it("should not allow removing other member if book member with edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookOwner, otherMember] = await CreateUsers(database, { count: 2 });

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [
                { userId: user!.userId, status: UserStatus.Administrator },
                { userId: otherMember!.userId, status: randomBoolean() ? UserStatus.Administrator : UserStatus.Member },
            ],
        });

        const res = await request(app)
            .delete(BookEndpoint.deleteBookMember(book!.bookId, otherMember!.userId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(404);
    });

    it("should allow removing self if book member", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [{ userId: user!.userId, status: UserStatus.Administrator }],
        });

        const res = await request(app)
            .delete(BookEndpoint.deleteBookMember(book!.bookId, user.userId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(204);
    });
});

describe("delete book recipe", () => {
    let database: Knex.Transaction;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).delete(BookEndpoint.deleteBookRecipe(uuid(), uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent book", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app).delete(BookEndpoint.deleteBookRecipe(uuid(), uuid())).set(token).send();

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if not book owner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: bookOwner!.userId,
            recipes: [{ name: uuid(), public: randomBoolean() }],
        });

        await KnexBookRepository.saveRecipes(database, { bookId: book!.bookId, recipes: [recipe!] });

        const res = await request(app)
            .delete(BookEndpoint.deleteBookRecipe(book!.bookId, recipe!.recipeId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if book member without edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: bookOwner!.userId,
            recipes: [{ name: uuid(), public: randomBoolean() }],
        });

        await KnexBookRepository.saveRecipes(database, { bookId: book!.bookId, recipes: [recipe!] });

        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Member,
                },
            ],
        });

        const res = await request(app)
            .delete(BookEndpoint.deleteBookRecipe(book!.bookId, recipe!.recipeId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(404);
    });

    it("should allow deletion if book member with edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: bookOwner!.userId,
            recipes: [{ name: uuid(), public: randomBoolean() }],
        });

        await KnexBookRepository.saveRecipes(database, { bookId: book!.bookId, recipes: [recipe!] });

        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Administrator,
                },
            ],
        });

        const res = await request(app)
            .delete(BookEndpoint.deleteBookRecipe(book!.bookId, recipe!.recipeId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(204);

        const { recipes: bookRecipes } = await KnexRecipeRepository.readAll(database, {
            userId: user.userId,
            filter: { books: [book!] },
        });

        expect(bookRecipes.length).toEqual(0);
    });

    it("should allow deletion if book owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [{ name: uuid(), public: randomBoolean() }],
        });

        await KnexBookRepository.saveRecipes(database, { bookId: book!.bookId, recipes: [recipe!] });

        const res = await request(app)
            .delete(BookEndpoint.deleteBookRecipe(book!.bookId, recipe!.recipeId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(204);

        const { recipes: bookRecipes } = await KnexRecipeRepository.readAll(database, {
            userId: user.userId,
            filter: { books: [book!] },
        });
        expect(bookRecipes.length).toEqual(0);
    });

    it("should delete recipe only from specified book", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            books: [book1, book2],
        } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [{ name: uuid() }, { name: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [{ name: uuid(), public: randomBoolean() }],
        });

        await KnexBookRepository.saveRecipes(database, [
            { bookId: book1!.bookId, recipes: [recipe!] },
            { bookId: book2!.bookId, recipes: [recipe!] },
        ]);

        const res = await request(app)
            .delete(BookEndpoint.deleteBookRecipe(book1!.bookId, recipe!.recipeId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(204);

        const { recipes: book1Recipes } = await KnexRecipeRepository.readAll(database, {
            userId: user.userId,
            filter: { books: [book1!] },
        });
        expect(book1Recipes.length).toEqual(0);

        const { recipes: book2Recipes } = await KnexRecipeRepository.readAll(database, {
            userId: user.userId,
            filter: { books: [book2!] },
        });

        expect(book2Recipes.length).toEqual(1);
    });
});

describe("get book", () => {
    let database: Knex.Transaction;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).get(BookEndpoint.getBook(uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent book", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app).get(BookEndpoint.getBook(uuid())).set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should not return book user doesn't have access to", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app).get(BookEndpoint.getBook(book!.bookId)).set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should return correct book details for book id", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [
                {
                    name: uuid(),
                    description: uuid(),
                    color: uuid(),
                    icon: uuid(),
                },
            ],
        });

        const res = await request(app).get(BookEndpoint.getBook(book!.bookId)).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetBookResponse;

        expect(data!.bookId).toEqual(book!.bookId);
        expect(data!.name).toEqual(book!.name);
        expect(data!.description).toEqual(book!.description);
        expect(data!.color).toEqual(book!.color);
        expect(data!.icon).toEqual(book!.icon);
        expect(data!.owner.userId).toEqual(user.userId);
        expect(data!.owner.firstName).toEqual(user.firstName);
    });

    it("should return a book that a user is a member of", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [
                {
                    name: uuid(),
                    description: uuid(),
                    members: [{ userId: user.userId }],
                },
            ],
        });

        const res = await request(app).get(BookEndpoint.getBook(book!.bookId)).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetBookResponse;

        expect(data!.bookId).toEqual(book!.bookId);
    });

    it("should return book members", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookMember] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [
                {
                    userId: bookMember!.userId,
                    status: UserStatus.Administrator,
                },
            ],
        });

        const res = await request(app).get(BookEndpoint.getBook(book!.bookId)).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetBookResponse;

        const bookRecipeData = Object.values(data!.members ?? {});

        expect(bookRecipeData.length).toEqual(1);
        expect(bookRecipeData[0]!.userId).toEqual(bookMember!.userId);
    });
});

describe("post book", () => {
    let database: Knex.Transaction;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).post(BookEndpoint.postBook);

        expect(res.statusCode).toEqual(401);
    });

    it("should create book", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const users = await CreateUsers(database);

        const books = {
            data: Array.from({ length: randomNumber() }).map((_, i) => ({
                name: uuid(),
                description: uuid(),
                color: uuid(),
                icon: uuid(),
                members: users!.map(({ userId }) => ({
                    userId,
                    status: randomBoolean() ? UserStatus.Administrator : UserStatus.Member,
                })),
            })),
        } satisfies PostBookRequestBody;

        const res = await request(app).post(BookEndpoint.postBook).set(token).send(books);

        expect(res.statusCode).toEqual(201);
        const { data } = res.body as PostBookResponse;

        expect(data!.length).toEqual(books.data.length);

        for (const book of data!) {
            const expectedBook = books.data.find(({ name }) => name === book.name)!;

            expect(book.name).toEqual(expectedBook.name);
            expect(book.description).toEqual(expectedBook.description);
            expect(book.color).toEqual(expectedBook.color);
            expect(book.icon).toEqual(expectedBook.icon);
            expect(book.owner.userId).toEqual(user.userId);
            expect(book.members!.length).toEqual(expectedBook.members.length);

            for (const { userId, status } of expectedBook.members) {
                const savedBookMember = book.members!.find(({ userId: savedUserId }) => savedUserId === userId);

                expect(savedBookMember!.status).toEqual(status);
            }
        }
    });
});

describe("put book", () => {
    let database: Knex.Transaction;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).put(BookEndpoint.putBook);

        expect(res.statusCode).toEqual(401);
    });

    it("should not allow editing if not book owner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .put(BookEndpoint.postBook)
            .set(token)
            .send({ data: [{ bookId: book!.bookId, name: "book" }] } satisfies PutBookRequestBody);

        expect(res.statusCode).toEqual(403);
    });

    it("should not allow editing if book member but not book owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });
        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Administrator,
                },
            ],
        });

        const res = await request(app)
            .put(BookEndpoint.putBook)
            .set(token)
            .send({ data: [{ bookId: book!.bookId, name: uuid() }] } satisfies PutBookRequestBody);

        expect(res.statusCode).toEqual(403);
    });

    it("should save updated book details as book owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [
                {
                    name: uuid(),
                    description: uuid(),
                },
            ],
        });

        const updatedBook = {
            data: { bookId: book!.bookId, name: uuid(), description: uuid() },
        } satisfies PutBookRequestBody;

        const res = await request(app).put(BookEndpoint.putBook).set(token).send(updatedBook);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as PostBookResponse;
        const [savedBook] = data!;

        expect(savedBook!.name).toEqual(updatedBook.data.name);
        expect(savedBook!.description).toEqual(updatedBook.data.description);
        expect(savedBook!.bookId).toEqual(book!.bookId);
        expect(savedBook!.owner.userId).toEqual(book!.owner.userId);
    });

    it("should save additional book members", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const initialUsers = await CreateUsers(database, { count: randomCount });
        const additionalUsers = await CreateUsers(database, { count: randomCount });

        const initialMembers: EntityMember[] = initialUsers.map(({ userId }) => ({ userId }));
        const additionalMembers: EntityMember[] = additionalUsers.map(({ userId }) => ({ userId }));
        const allMembers = [...initialMembers, ...additionalMembers];

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [
                {
                    name: uuid(),
                    description: uuid(),
                    members: initialMembers,
                },
            ],
        });

        expect(book!.members.length).toEqual(initialMembers.length);

        const res = await request(app)
            .put(BookEndpoint.putBook)
            .set(token)
            .send({ data: [{ ...book!, members: allMembers }] } satisfies PutBookRequestBody);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as PostBookResponse;
        const [savedBook] = data!;

        expect(savedBook!.members!.length).toEqual(allMembers.length);

        savedBook!.members!.forEach(({ userId }) => {
            const savedBookMember = allMembers.find(({ userId: savedUserId }) => savedUserId === userId);

            expect(savedBookMember).toBeTruthy();
        });
    });

    it("should remove some book members", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const initialMembers = await CreateUsers(database, { count: randomCount });

        const members: EntityMember[] = initialMembers.map(({ userId }) => ({ userId }));
        const reducedMembers: EntityMember[] = members.slice(0, Math.max((members.length - 1) / 2));
        const excludedMembers: EntityMember[] = members.filter(
            ({ userId }) => !reducedMembers.find(({ userId: savedUserId }) => savedUserId === userId)
        );

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [
                {
                    name: uuid(),
                    description: uuid(),
                    members,
                },
            ],
        });

        expect(book!.members.length).toEqual(members.length);
        const res = await request(app)
            .put(BookEndpoint.putBook)
            .set(token)
            .send({ data: [{ ...book, members: reducedMembers }] } satisfies PutBookRequestBody);
        expect(res.statusCode).toEqual(200);

        const { data } = res.body as PostBookResponse;
        const [updatedBook] = data!;

        expect(updatedBook!.members!.length).toEqual(reducedMembers.length);

        updatedBook!.members!.forEach(({ userId }) => {
            const savedBookMember = reducedMembers.find(({ userId: savedUserId }) => savedUserId === userId);
            const illegalMember = excludedMembers.some(({ userId: savedUserId }) => savedUserId === userId);

            expect(savedBookMember).toBeTruthy();
            expect(illegalMember).toBeFalsy();
        });
    });

    it("should remove all book members", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const members = await CreateUsers(database, { count: randomCount });

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [
                {
                    name: uuid(),
                    description: uuid(),
                    members,
                },
            ],
        });

        expect(book!.members.length).toEqual(members.length);

        const res = await request(app)
            .put(BookEndpoint.putBook)
            .set(token)
            .send({ data: [{ ...book, members: [] }] } satisfies PutBookRequestBody);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as PostBookResponse;
        const [updatedBook] = data!;

        expect(updatedBook!.members!.length).toEqual(0);
    });
});

describe("post book member", () => {
    let database: Knex.Transaction;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).post(BookEndpoint.postBookMember(uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent book", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app).post(BookEndpoint.postBookMember(uuid())).set(token).send();

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow joining if not pending book member", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app).post(BookEndpoint.postBookMember(book!.bookId)).set(token).send();

        expect(res.statusCode).toEqual(404);
    });

    it("should allow accepting if pending book member", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [
                {
                    name: uuid(),
                    description: uuid(),
                    members: [{ userId: user!.userId, status: UserStatus.Pending }],
                },
            ],
        });

        const res = await request(app).post(BookEndpoint.postBookMember(book!.bookId)).set(token).send();

        expect(res.statusCode).toEqual(201);

        const [bookMembers] = await KnexBookRepository.readMembers(database, book!);

        expect(bookMembers!.members.length).toEqual(1);

        const [bookMember] = bookMembers!.members;

        expect(bookMember!.status).toEqual(UserStatus.Member);
        expect(bookMember!.userId).toEqual(user.userId);
    });
});

describe("post book recipe", () => {
    let database: Knex.Transaction;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).post(BookEndpoint.postBookRecipe(uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent book", async () => {
        const [token] = await PrepareAuthenticatedUser(database);

        const res = await request(app)
            .post(BookEndpoint.postBookRecipe(uuid()))
            .set(token)
            .send({ data: { recipeId: uuid() } } satisfies PostBookRecipeRequestBody);

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow adding recipe if not book owner", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const res = await request(app)
            .post(BookEndpoint.postBookRecipe(book!.bookId))
            .set(token)
            .send({ data: { recipeId: uuid() } } satisfies PostBookRecipeRequestBody);

        expect(res.statusCode).toEqual(404);

        const { recipes: bookRecipes } = await KnexRecipeRepository.readAll(database, {
            userId: bookOwner!.userId,
            filter: { books: [book!] },
        });
        expect(bookRecipes.length).toEqual(0);
    });

    it("should not allow adding recipe if book member without edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user!.userId,
            recipes: [{ name: uuid(), public: randomBoolean() }],
        });

        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Member,
                },
            ],
        });

        const res = await request(app)
            .post(BookEndpoint.postBookRecipe(book!.bookId))
            .set(token)
            .send({ data: { recipeId: recipe!.recipeId } } satisfies PostBookRecipeRequestBody);

        expect(res.statusCode).toEqual(404);
    });

    it("should allow adding recipe if book member with edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user!.userId,
            recipes: [{ name: uuid(), public: randomBoolean() }],
        });

        await KnexBookRepository.saveMembers(database, {
            bookId: book!.bookId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Administrator,
                },
            ],
        });

        const res = await request(app)
            .post(BookEndpoint.postBookRecipe(book!.bookId))
            .set(token)
            .send({ data: { recipeId: recipe!.recipeId } } satisfies PostBookRecipeRequestBody);

        expect(res.statusCode).toEqual(201);

        const { recipes: bookRecipes } = await KnexRecipeRepository.readAll(database, {
            userId: user.userId,
            filter: { books: [book!] },
        });

        expect(bookRecipes.length).toEqual(1);

        const [bookRecipe] = bookRecipes;

        expect(bookRecipe!.recipeId).toEqual(recipe!.recipeId);
    });

    it("should allow adding recipe if book owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [{ name: uuid(), description: uuid() }],
        });

        const {
            recipes: [recipe],
        } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: [{ name: uuid(), public: randomBoolean() }],
        });

        const res = await request(app)
            .post(BookEndpoint.postBookRecipe(book!.bookId))
            .set(token)
            .send({ data: { recipeId: recipe!.recipeId } } satisfies PostBookRecipeRequestBody);

        expect(res.statusCode).toEqual(201);

        const { recipes: bookRecipes } = await KnexRecipeRepository.readAll(database, {
            userId: user.userId,
            filter: { books: [book!] },
        });
        expect(bookRecipes.length).toEqual(1);

        const [bookRecipe] = bookRecipes;

        expect(bookRecipe!.recipeId).toEqual(recipe!.recipeId);
    });
});

describe("get book recipes", () => {
    let database: Knex.Transaction;
    let app: Express;

    beforeEach(async () => {
        database = await db.transaction();
        app = setupApp({ database });
    });

    afterEach(async () => {
        database.rollback();
    });

    it("route should require authentication", async () => {
        const res = await request(app).get(BookEndpoint.getBookRecipes(uuid()));
        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for a book the user cannot access", async () => {
        const [token] = await PrepareAuthenticatedUser(database);
        const [bookOwner] = await CreateUsers(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: bookOwner!.userId,
            books: [{ name: uuid() }],
        });

        const res = await request(app).get(BookEndpoint.getBookRecipes(book!.bookId)).set(token);
        expect(res.statusCode).toEqual(404);
    });

    it("should return only recipes for the specified book", async () => {
        const [token, user] = await PrepareAuthenticatedUser(database);

        const {
            books: [book],
        } = await KnexBookRepository.create(database, {
            userId: user.userId,
            books: [{ name: uuid() }],
        });

        const { recipes: recipesInBook } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: Array.from({ length: randomNumber() }).map(() => ({ name: uuid(), public: randomBoolean() })),
        });

        const { recipes: recipesNotInBook } = await KnexRecipeRepository.create(database, {
            userId: user.userId,
            recipes: Array.from({ length: randomNumber() }).map(() => ({ name: uuid(), public: randomBoolean() })),
        });

        await KnexBookRepository.saveRecipes(database, { bookId: book!.bookId, recipes: recipesInBook });

        const res = await request(app).get(BookEndpoint.getBookRecipes(book!.bookId)).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetBookRecipesResponse;

        const recipeIdsInBook = recipesInBook.map(r => r.recipeId);
        const recipeIdsNotInBook = recipesNotInBook.map(r => r.recipeId);

        expect(data).toBeDefined();
        expect(data!.length).toEqual(recipesInBook.length);
        expect(data!.every(({ recipeId }) => recipeIdsInBook.includes(recipeId))).toBe(true);
        expect(data!.every(({ recipeId }) => !recipeIdsNotInBook.includes(recipeId))).toBe(true);
    });
});
