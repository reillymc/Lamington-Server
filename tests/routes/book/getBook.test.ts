import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import {
    BookEndpoint,
    CleanTables,
    CreateUsers,
    PrepareAuthenticatedUser,
    randomBit,
    randomNumber,
} from "../../helpers";
import { GetBookResponse } from "../../../src/routes/spec";
import { BookActions, BookMemberActions, BookRecipeActions, RecipeActions } from "../../../src/controllers";
import { BookRecipe, ServiceParams } from "../../../src/database";
import { BookCustomisations } from "../../../src/routes/helpers";
import { RecipeService } from "../../../src/controllers/spec";

const getBookCustomisations = (): BookCustomisations => {
    return {
        color: uuid(),
        icon: uuid(),
    };
};

beforeEach(async () => {
    await CleanTables("book", "user", "recipe", "book_recipe", "book_member");
});

afterAll(async () => {
    await CleanTables("book", "user", "recipe", "book_recipe", "book_member");
});

test("route should require authentication", async () => {
    const res = await request(app).get(BookEndpoint.getBook(uuid()));

    expect(res.statusCode).toEqual(401);
});

test("should return 404 for non-existant book", async () => {
    const [token] = await PrepareAuthenticatedUser();

    const res = await request(app).get(BookEndpoint.getBook(uuid())).set(token);

    expect(res.statusCode).toEqual(404);
});

test("should not return book user doesn't have access to", async () => {
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

test("should return correct book details for book id", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const customisations = getBookCustomisations();

    const createBookParams = {
        bookId: uuid(),
        name: uuid(),
        description: uuid(),
        customisations: JSON.stringify(customisations),
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

test("should return a book that a user is a member of", async () => {
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

test("should return book recipes", async () => {
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
                public: randomBit(),
            } satisfies ServiceParams<RecipeService, "Save">)
    );

    const recipesNotInBook = Array.from({ length: randomNumber() }).map(
        () =>
            ({
                recipeId: uuid(),
                name: uuid(),
                createdBy: user.userId,
                public: randomBit(),
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
    expect(bookRecipeData.every(({ recipeId }) => recipesInBook.some(recipe => recipe.recipeId === recipeId))).toEqual(
        true
    );
    expect(
        bookRecipeData.every(({ recipeId }) => recipesNotInBook.every(recipe => recipe.recipeId !== recipeId))
    ).toEqual(true);
});

test("should return book members", async () => {
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
                accepted: true,
                allowEditing: true,
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
