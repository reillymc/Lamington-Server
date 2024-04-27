import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { BookActions, BookMemberActions, BookRecipeActions, RecipeActions } from "../../../src/controllers";
import { RecipeService } from "../../../src/controllers/spec";
import { ServiceParams } from "../../../src/database";
import { PostBookRecipeRequestBody, UserStatus } from "../../../src/routes/spec";
import { BookEndpoint, CreateUsers, PrepareAuthenticatedUser, randomBoolean } from "../../helpers";

test("route should require authentication", async () => {
    const res = await request(app).post(BookEndpoint.postBookRecipe(uuid()));

    expect(res.statusCode).toEqual(401);
});

test("should return 404 for non-existant book", async () => {
    const [token] = await PrepareAuthenticatedUser();

    const res = await request(app)
        .post(BookEndpoint.postBookRecipe(uuid()))
        .set(token)
        .send({ data: { recipeId: uuid() } } satisfies PostBookRecipeRequestBody);

    expect(res.statusCode).toEqual(404);
});

test("should not allow adding recipe if not book owner", async () => {
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

test("should not allow adding recipe if book member without edit permission", async () => {
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

test("should allow adding recipe if book member with edit permission", async () => {
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

test("should allow editing if book owner", async () => {
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
