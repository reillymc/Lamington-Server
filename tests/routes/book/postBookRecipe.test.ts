import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { BookEndpoint, CleanTables, CreateUsers, PrepareAuthenticatedUser } from "../../helpers";
import { BookActions, BookMemberActions, BookRecipeActions, RecipeActions } from "../../../src/controllers";
import { CreateBookParams } from "../../../src/controllers/book";
import { PostBookRecipeRequestBody, PostRecipeRequest } from "../../../src/routes/spec";

beforeEach(async () => {
    await CleanTables("book", "user", "book_member", "book_recipe");
});

afterAll(async () => {
    await CleanTables("book", "user", "book_member", "book_recipe");
});

test("route should require authentication", async () => {
    const res = await request(app).post(BookEndpoint.postBookRecipe(uuid()));

    expect(res.statusCode).toEqual(401);
});

test("should return 404 for non-existant book", async () => {
    const [token] = await PrepareAuthenticatedUser();

    const res = await request(app)
        .post(BookEndpoint.postBookRecipe(uuid()))
        .set(token)
        .send({ recipeId: uuid() } as PostBookRecipeRequestBody);

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
        .post(BookEndpoint.postBookRecipe(book.bookId))
        .set(token)
        .send({ recipeId: uuid() } as PostBookRecipeRequestBody);

    expect(res.statusCode).toEqual(404);
});

test("should not allow editing if book member without edit permission", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [bookOwner] = await CreateUsers();

    const book = {
        bookId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: bookOwner!.userId,
    } satisfies CreateBookParams;

    const recipe = {
        recipeId: uuid(),
        name: uuid(),
        userId: user!.userId,
    } satisfies PostRecipeRequest;

    await BookActions.save(book);
    await RecipeActions.save(recipe);
    await BookMemberActions.update({
        entityId: book.bookId,
        userId: user!.userId,
        accepted: true,
        allowEditing: false,
    });

    const res = await request(app)
        .post(BookEndpoint.postBookRecipe(book.bookId))
        .set(token)
        .send({ recipeId: recipe.recipeId } as PostBookRecipeRequestBody);

    expect(res.statusCode).toEqual(404);
});

test("should allow editing if book member with edit permission", async () => {
    const [token, user] = await PrepareAuthenticatedUser();
    const [bookOwner] = await CreateUsers();

    const book = {
        bookId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: bookOwner!.userId,
    } satisfies CreateBookParams;

    const recipe = {
        recipeId: uuid(),
        name: uuid(),
        userId: user!.userId,
    } satisfies PostRecipeRequest;

    await BookActions.save(book);
    await RecipeActions.save(recipe);
    await BookMemberActions.update({
        entityId: book.bookId,
        userId: user!.userId,
        accepted: true,
        allowEditing: true,
    });

    const res = await request(app)
        .post(BookEndpoint.postBookRecipe(book.bookId))
        .set(token)
        .send({ recipeId: recipe.recipeId } as PostBookRecipeRequestBody);

    expect(res.statusCode).toEqual(201);

    const bookRecipes = await BookRecipeActions.read({ bookId: book.bookId });

    expect(bookRecipes.length).toEqual(1);

    const [bookRecipe] = bookRecipes;

    expect(bookRecipe?.bookId).toEqual(book.bookId);
    expect(bookRecipe?.recipeId).toEqual(recipe.recipeId);
});

test("should allow editing if book owner", async () => {
    const [token, user] = await PrepareAuthenticatedUser();

    const book = {
        bookId: uuid(),
        name: uuid(),
        description: uuid(),
        createdBy: user.userId,
    } satisfies CreateBookParams;

    const recipe = {
        recipeId: uuid(),
        name: uuid(),
        userId: user!.userId,
    } satisfies PostRecipeRequest;

    await BookActions.save(book);
    await RecipeActions.save(recipe);

    const res = await request(app)
        .post(BookEndpoint.postBookRecipe(book.bookId))
        .set(token)
        .send({ recipeId: recipe.recipeId } as PostBookRecipeRequestBody);

    expect(res.statusCode).toEqual(201);

    const bookRecipes = await BookRecipeActions.read({ bookId: book.bookId });

    expect(bookRecipes.length).toEqual(1);

    const [bookRecipe] = bookRecipes;

    expect(bookRecipe?.bookId).toEqual(book.bookId);
    expect(bookRecipe?.recipeId).toEqual(recipe.recipeId);
});
