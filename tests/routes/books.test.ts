import { expect } from "expect";
import type { Express } from "express";
import { before, describe, it } from "node:test";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { setupApp } from "../../src/app.ts";
import { BookActions, BookRecipeActions, RecipeActions, BookMemberActions } from "../../src/controllers/index.ts";
import type { RecipeService } from "../../src/controllers/spec/recipe.ts";
import type { BookRecipe, ServiceParams } from "../../src/database/index.ts";
import type { BookCustomisations } from "../../src/routes/helpers/book.ts";
import {
    type DeleteBookRequestParams,
    type EntityMember,
    type GetBookResponse,
    type GetBooksResponse,
    type PostBookRecipeRequestBody,
    type PostBookRequestBody,
    UserStatus,
} from "../../src/routes/spec/index.ts";
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
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).get(BookEndpoint.getBooks);

        expect(res.statusCode).toEqual(401);
    });

    it("should return only books for current user", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const [otherUser] = await CreateUsers({ count: 1 });

        const [_, count] = await CreateBooks({ createdBy: user.userId });
        await CreateBooks({ createdBy: otherUser!.userId });

        const res = await request(app).get(BookEndpoint.getBooks).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetBooksResponse;

        expect(Object.keys(data ?? {}).length).toEqual(count);
    });

    it("should return correct book membership details for user", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const [otherUser] = await CreateUsers({ count: 1 });

        const [editableBooks] = await CreateBooks({ createdBy: otherUser!.userId });
        const [acceptedBooks] = await CreateBooks({ createdBy: otherUser!.userId });
        const [nonAcceptedBooks] = await CreateBooks({ createdBy: otherUser!.userId });

        await BookMemberActions.save([
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
});

describe("delete book", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).delete(BookEndpoint.deleteBook(uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent book", async () => {
        const [token] = await PrepareAuthenticatedUser();

        const res = await request(app)
            .delete(BookEndpoint.deleteBook(uuid()))
            .set(token)
            .send({ bookId: uuid() } satisfies DeleteBookRequestParams);

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if not book owner", async () => {
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
            .delete(BookEndpoint.deleteBook(book.bookId))
            .set(token)
            .send({ bookId: book.bookId } satisfies DeleteBookRequestParams);

        expect(res.statusCode).toEqual(403);
    });

    it("should not allow deletion if book member but not book owner", async () => {
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
            .delete(BookEndpoint.deleteBook(book.bookId))
            .set(token)
            .send({ bookId: book.bookId } satisfies DeleteBookRequestParams);

        expect(res.statusCode).toEqual(403);
    });

    it("should delete book", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const book = {
            bookId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: user!.userId,
        } satisfies ServiceParams<BookActions, "save">;

        await BookActions.save(book);

        const res = await request(app).delete(BookEndpoint.deleteBook(book.bookId)).set(token).send(book);

        expect(res.statusCode).toEqual(201);

        const books = await BookActions.read({ bookId: book.bookId, userId: user.userId });

        expect(books.length).toEqual(0);
    });
});

describe("delete book member", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).delete(BookEndpoint.deleteBookMember(uuid(), uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent book", async () => {
        const [token] = await PrepareAuthenticatedUser();

        const res = await request(app).delete(BookEndpoint.deleteBookMember(uuid(), uuid())).set(token).send();

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow leaving a book the user owns", async () => {
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

    it("should allow removing member if book owner", async () => {
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

        const res = await request(app)
            .delete(BookEndpoint.deleteBookMember(book.bookId, user.userId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(201);

        const bookMembers = await BookMemberActions.read(book);

        expect(bookMembers.length).toEqual(0);
    });

    it("should not allow removing other member if book member with edit permission", async () => {
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

    it("should allow removing self if book member", async () => {
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
            .delete(BookEndpoint.deleteBookMember(book.bookId, user.userId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(201);
    });
});

describe("delete book recipe", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).delete(BookEndpoint.deleteBookRecipe(uuid(), uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent book", async () => {
        const [token] = await PrepareAuthenticatedUser();

        const res = await request(app).delete(BookEndpoint.deleteBookRecipe(uuid(), uuid())).set(token).send();

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow deletion if not book owner", async () => {
        const [token] = await PrepareAuthenticatedUser();
        const [bookOwner] = await CreateUsers();

        const book = {
            bookId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: bookOwner!.userId,
        } satisfies ServiceParams<BookActions, "save">;

        const recipe = {
            recipeId: uuid(),
            name: uuid(),
            createdBy: bookOwner!.userId,
            public: randomBoolean(),
        } satisfies ServiceParams<RecipeService, "Save">;

        const bookRecipe = {
            recipeId: recipe.recipeId,
            bookId: book.bookId,
        } satisfies ServiceParams<BookRecipeActions, "save">;

        await BookActions.save(book);
        await RecipeActions.Save(recipe);
        await BookRecipeActions.save(bookRecipe);

        const res = await request(app)
            .delete(BookEndpoint.deleteBookRecipe(book.bookId, bookRecipe.recipeId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(403);
    });

    it("should not allow deletion if book member without edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const [bookOwner] = await CreateUsers();

        const book = {
            bookId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: bookOwner!.userId,
        } satisfies ServiceParams<BookActions, "save">;

        const recipe = {
            recipeId: uuid(),
            name: uuid(),
            createdBy: bookOwner!.userId,
            public: randomBoolean(),
        } satisfies ServiceParams<RecipeService, "Save">;

        const bookRecipe = {
            recipeId: recipe.recipeId,
            bookId: book.bookId,
        } satisfies ServiceParams<BookRecipeActions, "save">;

        await BookActions.save(book);
        await RecipeActions.Save(recipe);
        await BookRecipeActions.save(bookRecipe);
        await BookMemberActions.save({
            bookId: book.bookId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Member,
                },
            ],
        });

        const res = await request(app)
            .delete(BookEndpoint.deleteBookRecipe(book.bookId, bookRecipe.recipeId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(403);
    });

    it("should allow deletion if book member with edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const [bookOwner] = await CreateUsers();

        const book = {
            bookId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: bookOwner!.userId,
        } satisfies ServiceParams<BookActions, "save">;

        const recipe = {
            recipeId: uuid(),
            name: uuid(),
            createdBy: bookOwner!.userId,
            public: randomBoolean(),
        } satisfies ServiceParams<RecipeService, "Save">;

        const bookRecipe = {
            recipeId: recipe.recipeId,
            bookId: book.bookId,
        } satisfies ServiceParams<BookRecipeActions, "save">;

        await BookActions.save(book);
        await RecipeActions.Save(recipe);
        await BookRecipeActions.save(bookRecipe);
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
            .delete(BookEndpoint.deleteBookRecipe(book.bookId, bookRecipe.recipeId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(201);

        const bookRecipes = await BookRecipeActions.read({ bookId: book.bookId });

        expect(bookRecipes.length).toEqual(0);
    });

    it("should allow deletion if book owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const book = {
            bookId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: user.userId,
        } satisfies ServiceParams<BookActions, "save">;

        const recipe = {
            recipeId: uuid(),
            name: uuid(),
            createdBy: user!.userId,
            public: randomBoolean(),
        } satisfies ServiceParams<RecipeService, "Save">;

        const bookRecipe = {
            recipeId: recipe.recipeId,
            bookId: book.bookId,
        } satisfies ServiceParams<BookRecipeActions, "save">;

        await BookActions.save(book);
        await RecipeActions.Save(recipe);
        await BookRecipeActions.save(bookRecipe);

        const res = await request(app)
            .delete(BookEndpoint.deleteBookRecipe(book.bookId, bookRecipe.recipeId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(201);

        const bookRecipes = await BookRecipeActions.read({ bookId: book.bookId });

        expect(bookRecipes.length).toEqual(0);
    });

    it("should delete recipe only from specified book", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const book1 = {
            bookId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: user.userId,
        } satisfies ServiceParams<BookActions, "save">;

        const book2 = {
            bookId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: user.userId,
        } satisfies ServiceParams<BookActions, "save">;

        const recipe = {
            recipeId: uuid(),
            name: uuid(),
            createdBy: user!.userId,
            public: randomBoolean(),
        } satisfies ServiceParams<RecipeService, "Save">;

        const bookRecipe1 = {
            recipeId: recipe.recipeId,
            bookId: book1.bookId,
        } satisfies ServiceParams<BookRecipeActions, "save">;

        const bookRecipe2 = {
            recipeId: recipe.recipeId,
            bookId: book2.bookId,
        } satisfies ServiceParams<BookRecipeActions, "save">;

        await BookActions.save(book1);
        await BookActions.save(book2);
        await RecipeActions.Save(recipe);
        await BookRecipeActions.save([bookRecipe1, bookRecipe2]);

        const res = await request(app)
            .delete(BookEndpoint.deleteBookRecipe(book1.bookId, bookRecipe1.recipeId))
            .set(token)
            .send();

        expect(res.statusCode).toEqual(201);

        const bookRecipes = await BookRecipeActions.read({ bookId: book1.bookId });

        expect(bookRecipes.length).toEqual(0);

        const bookRecipes2 = await BookRecipeActions.read({ bookId: book2.bookId });

        expect(bookRecipes2.length).toEqual(1);
    });
});

describe("get book", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    const getBookCustomisations = (): BookCustomisations => {
        return {
            color: uuid(),
            icon: uuid(),
        };
    };

    it("route should require authentication", async () => {
        const res = await request(app).get(BookEndpoint.getBook(uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent book", async () => {
        const [token] = await PrepareAuthenticatedUser();

        const res = await request(app).get(BookEndpoint.getBook(uuid())).set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should not return book user doesn't have access to", async () => {
        const [token] = await PrepareAuthenticatedUser();
        const [bookOwner] = await CreateUsers();

        const createBookParams = {
            bookId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: bookOwner!.userId,
        } satisfies ServiceParams<BookActions, "save">;

        await BookActions.save(createBookParams);

        const res = await request(app).get(BookEndpoint.getBook(createBookParams.bookId)).set(token);

        expect(res.statusCode).toEqual(404);
    });

    it("should return correct book details for book id", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const customisations = getBookCustomisations();

        const createBookParams = {
            bookId: uuid(),
            name: uuid(),
            description: uuid(),
            customisations: customisations,
            createdBy: user.userId,
        } satisfies ServiceParams<BookActions, "save">;

        await BookActions.save(createBookParams);

        const res = await request(app).get(BookEndpoint.getBook(createBookParams.bookId)).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetBookResponse;

        expect(data?.bookId).toEqual(createBookParams.bookId);
        expect(data?.name).toEqual(createBookParams.name);
        expect(data?.description).toEqual(createBookParams.description);
        expect(data?.createdBy.userId).toEqual(createBookParams.createdBy);
        expect(data?.color).toEqual(customisations.color);
        expect(data?.icon).toEqual(customisations.icon);
        expect(data?.createdBy.firstName).toEqual(user.firstName);
    });

    it("should return a book that a user is a member of", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const [bookOwner] = await CreateUsers();

        const createBookParams = {
            bookId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: bookOwner!.userId,
            members: [{ userId: user.userId }],
        } satisfies ServiceParams<BookActions, "save">;

        await BookActions.save(createBookParams);

        const res = await request(app).get(BookEndpoint.getBook(createBookParams.bookId)).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetBookResponse;

        expect(data?.bookId).toEqual(createBookParams.bookId);
    });

    it("should return book recipes", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const book = {
            bookId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: user.userId,
        } satisfies ServiceParams<BookActions, "save">;

        await BookActions.save(book);

        const recipesInBook = Array.from({ length: randomNumber() }).map(
            () =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: user.userId,
                    public: randomBoolean(),
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        const recipesNotInBook = Array.from({ length: randomNumber() }).map(
            () =>
                ({
                    recipeId: uuid(),
                    name: uuid(),
                    createdBy: user.userId,
                    public: randomBoolean(),
                } satisfies ServiceParams<RecipeService, "Save">)
        );

        await RecipeActions.Save(recipesInBook);

        const bookRecipes = recipesInBook.map(
            ({ recipeId }) =>
                ({
                    bookId: book.bookId,
                    recipeId,
                } satisfies BookRecipe)
        );

        await BookRecipeActions.save(bookRecipes);

        const res = await request(app).get(BookEndpoint.getBook(book.bookId)).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetBookResponse;

        const bookRecipeData = Object.values(data!.recipes!);

        expect(bookRecipeData.length).toEqual(recipesInBook.length);
        expect(
            bookRecipeData.every(({ recipeId }) => recipesInBook.some(recipe => recipe.recipeId === recipeId))
        ).toEqual(true);
        expect(
            bookRecipeData.every(({ recipeId }) => recipesNotInBook.every(recipe => recipe.recipeId !== recipeId))
        ).toEqual(true);
    });

    it("should return book members", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const [bookMember] = await CreateUsers();

        const book = {
            bookId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: user.userId,
        } satisfies ServiceParams<BookActions, "save">;

        await BookActions.save(book);

        await BookMemberActions.save({
            bookId: book.bookId,
            members: [
                {
                    userId: bookMember!.userId,
                    status: UserStatus.Administrator,
                },
            ],
        });

        const res = await request(app).get(BookEndpoint.getBook(book.bookId)).set(token);

        expect(res.statusCode).toEqual(200);

        const { data } = res.body as GetBookResponse;

        const bookRecipeData = Object.values(data?.members ?? {});

        expect(bookRecipeData.length).toEqual(1);
        expect(bookRecipeData[0]?.userId).toEqual(bookMember?.userId);
    });
});

describe("post book", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).post(BookEndpoint.postBook);

        expect(res.statusCode).toEqual(401);
    });

    it("should not allow editing if not book owner", async () => {
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

    it("should not allow editing if book member but not book owner", async () => {
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

    it("should create book", async () => {
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
                    status: randomBoolean() ? UserStatus.Administrator : UserStatus.Member,
                })),
            })),
        } satisfies PostBookRequestBody;

        const res = await request(app).post(BookEndpoint.postBook).set(token).send(books);

        expect(res.statusCode).toEqual(201);

        const savedBooks = await BookActions.readMy({ userId: user.userId });

        expect(savedBooks.length).toEqual(books.data.length);

        expect(savedBooks.length).toEqual(books.data.length);

        const savedBookMembers = await BookMemberActions.read(savedBooks);

        for (const book of savedBooks) {
            const expectedBook = books.data.find(({ bookId }) => bookId === book.bookId);
            const actualBookMembers = savedBookMembers.filter(({ bookId }) => bookId === book.bookId);

            const { color, icon } = book.customisations!;

            expect(book?.name).toEqual(expectedBook!.name);
            expect(book?.description).toEqual(expectedBook!.description);
            expect(color).toEqual(expectedBook!.color);
            expect(icon).toEqual(expectedBook!.icon);
            expect(book?.createdBy).toEqual(user.userId);
            expect(actualBookMembers.length).toEqual(expectedBook!.members.length);

            for (const { userId, status } of expectedBook!.members) {
                const savedBookMember = actualBookMembers.find(({ userId: savedUserId }) => savedUserId === userId);

                expect(savedBookMember).toBeTruthy();

                expect(savedBookMember?.status).toEqual(status);
            }
        }
    });

    it("should save updated book details as book owner", async () => {
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

    it("should save additional book members", async () => {
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

        const initialBookMembers = await BookMemberActions.read(book!);
        expect(initialBookMembers.length).toEqual(initialMembers.length);

        const res = await request(app)
            .post(BookEndpoint.postBook)
            .set(token)
            .send({ data: { ...book, members: allMembers } } satisfies PostBookRequestBody);

        expect(res.statusCode).toEqual(201);

        const savedBookMembers = await BookMemberActions.read(book!);

        expect(savedBookMembers.length).toEqual(allMembers.length);

        savedBookMembers.forEach(({ userId }) => {
            const savedBookMember = allMembers.find(({ userId: savedUserId }) => savedUserId === userId);

            expect(savedBookMember).toBeTruthy();
        });
    });

    it("should remove some book members", async () => {
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

        const initialBookMembers = await BookMemberActions.read(book!);
        expect(initialBookMembers.length).toEqual(members.length);
        const res = await request(app)
            .post(BookEndpoint.postBook)
            .set(token)
            .send({ data: { ...book, members: reducedMembers } } satisfies PostBookRequestBody);

        expect(res.statusCode).toEqual(201);

        const updatedBookMembers = await BookMemberActions.read(book!);
        expect(updatedBookMembers.length).toEqual(reducedMembers.length);

        updatedBookMembers.forEach(({ userId }) => {
            const savedBookMember = reducedMembers.find(({ userId: savedUserId }) => savedUserId === userId);
            const illegalMember = excludedMembers.some(({ userId: savedUserId }) => savedUserId === userId);

            expect(savedBookMember).toBeTruthy();
            expect(illegalMember).toBeFalsy();
        });
    });

    it("should remove all book members", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const members = await CreateUsers({ count: randomCount });

        const [book] = await BookActions.save({
            bookId: uuid(),
            createdBy: user.userId,
            name: uuid(),
            description: uuid(),
            members: members.map(({ userId }) => ({ userId })),
        });

        const initialBookMembers = await BookMemberActions.read(book!);
        expect(initialBookMembers.length).toEqual(members.length);

        const res = await request(app)
            .post(BookEndpoint.postBook)
            .set(token)
            .send({ data: { ...book, members: [] } } satisfies PostBookRequestBody);

        expect(res.statusCode).toEqual(201);

        const savedBookMembers = await BookMemberActions.read(book!);

        expect(savedBookMembers.length).toEqual(0);
    });
});

describe("post book member", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).post(BookEndpoint.postBookMember(uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent book", async () => {
        const [token] = await PrepareAuthenticatedUser();

        const res = await request(app).post(BookEndpoint.postBookMember(uuid())).set(token).send();

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow editing if not existing book member", async () => {
        const [token] = await PrepareAuthenticatedUser();
        const [bookOwner] = await CreateUsers();

        const book = {
            bookId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: bookOwner!.userId,
        } satisfies ServiceParams<BookActions, "save">;

        await BookActions.save(book);

        const res = await request(app).post(BookEndpoint.postBookMember(book.bookId)).set(token).send();

        expect(res.statusCode).toEqual(403);
    });

    it("should allow accepting if existing book member", async () => {
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

        const res = await request(app).post(BookEndpoint.postBookMember(book.bookId)).set(token).send();

        expect(res.statusCode).toEqual(201);

        const bookMembers = await BookMemberActions.read(book);

        expect(bookMembers.length).toEqual(1);

        const [bookMember] = bookMembers;

        expect(bookMember?.status).toEqual(UserStatus.Member);
        expect(bookMember?.userId).toEqual(user.userId);
    });
});

describe("post book recipe", () => {
    let app: Express;

    before(async () => {
        app = setupApp();
    });

    it("route should require authentication", async () => {
        const res = await request(app).post(BookEndpoint.postBookRecipe(uuid()));

        expect(res.statusCode).toEqual(401);
    });

    it("should return 404 for non-existent book", async () => {
        const [token] = await PrepareAuthenticatedUser();

        const res = await request(app)
            .post(BookEndpoint.postBookRecipe(uuid()))
            .set(token)
            .send({ data: { recipeId: uuid() } } satisfies PostBookRecipeRequestBody);

        expect(res.statusCode).toEqual(404);
    });

    it("should not allow adding recipe if not book owner", async () => {
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
            .post(BookEndpoint.postBookRecipe(book.bookId))
            .set(token)
            .send({ data: { recipeId: uuid() } } satisfies PostBookRecipeRequestBody);

        expect(res.statusCode).toEqual(403);
    });

    it("should not allow adding recipe if book member without edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const [bookOwner] = await CreateUsers();

        const book = {
            bookId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: bookOwner!.userId,
        } satisfies ServiceParams<BookActions, "save">;

        const recipe = {
            recipeId: uuid(),
            name: uuid(),
            createdBy: user!.userId,
            public: randomBoolean(),
        } satisfies ServiceParams<RecipeService, "Save">;

        await BookActions.save(book);
        await RecipeActions.Save(recipe);
        await BookMemberActions.save({
            bookId: book.bookId,
            members: [
                {
                    userId: user!.userId,
                    status: UserStatus.Member,
                },
            ],
        });

        const res = await request(app)
            .post(BookEndpoint.postBookRecipe(book.bookId))
            .set(token)
            .send({ data: { recipeId: recipe.recipeId } } satisfies PostBookRecipeRequestBody);

        expect(res.statusCode).toEqual(403);
    });

    it("should allow adding recipe if book member with edit permission", async () => {
        const [token, user] = await PrepareAuthenticatedUser();
        const [bookOwner] = await CreateUsers();

        const book = {
            bookId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: bookOwner!.userId,
        } satisfies ServiceParams<BookActions, "save">;

        const recipe = {
            recipeId: uuid(),
            name: uuid(),
            createdBy: user!.userId,
            public: randomBoolean(),
        } satisfies ServiceParams<RecipeService, "Save">;

        await BookActions.save(book);
        await RecipeActions.Save(recipe);
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
            .post(BookEndpoint.postBookRecipe(book.bookId))
            .set(token)
            .send({ data: { recipeId: recipe.recipeId } } satisfies PostBookRecipeRequestBody);

        expect(res.statusCode).toEqual(201);

        const bookRecipes = await BookRecipeActions.read({ bookId: book.bookId });

        expect(bookRecipes.length).toEqual(1);

        const [bookRecipe] = bookRecipes;

        expect(bookRecipe?.bookId).toEqual(book.bookId);
        expect(bookRecipe?.recipeId).toEqual(recipe.recipeId);
    });

    it("should allow editing if book owner", async () => {
        const [token, user] = await PrepareAuthenticatedUser();

        const book = {
            bookId: uuid(),
            name: uuid(),
            description: uuid(),
            createdBy: user.userId,
        } satisfies ServiceParams<BookActions, "save">;

        const recipe = {
            recipeId: uuid(),
            name: uuid(),
            createdBy: user!.userId,
            public: randomBoolean(),
        } satisfies ServiceParams<RecipeService, "Save">;

        await BookActions.save(book);
        await RecipeActions.Save(recipe);

        const res = await request(app)
            .post(BookEndpoint.postBookRecipe(book.bookId))
            .set(token)
            .send({ data: { recipeId: recipe.recipeId } } satisfies PostBookRecipeRequestBody);

        expect(res.statusCode).toEqual(201);

        const bookRecipes = await BookRecipeActions.read({ bookId: book.bookId });

        expect(bookRecipes.length).toEqual(1);

        const [bookRecipe] = bookRecipes;

        expect(bookRecipe?.bookId).toEqual(book.bookId);
        expect(bookRecipe?.recipeId).toEqual(recipe.recipeId);
    });
});
