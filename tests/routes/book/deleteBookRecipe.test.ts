import request from "supertest";
import { v4 as uuid } from "uuid";

import app from "../../../src/app";
import { BookActions, BookMemberActions, BookRecipeActions, RecipeActions } from "../../../src/controllers";
import { RecipeService } from "../../../src/controllers/spec";
import { ServiceParams } from "../../../src/database";
import { UserStatus } from "../../../src/routes/spec";
import { BookEndpoint, CleanTables, CreateUsers, PrepareAuthenticatedUser, randomBoolean } from "../../helpers";

beforeEach(async () => {
    await CleanTables("book", "user", "book_member", "book_recipe");
});

afterAll(async () => {
    await CleanTables("book", "user", "book_member", "book_recipe");
});

test("route should require authentication", async () => {
    const res = await request(app).delete(BookEndpoint.deleteBookRecipe(uuid(), uuid()));

    expect(res.statusCode).toEqual(401);
});

test("should return 404 for non-existant book", async () => {
    const [token] = await PrepareAuthenticatedUser();

    const res = await request(app).delete(BookEndpoint.deleteBookRecipe(uuid(), uuid())).set(token).send();

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

test("should not allow deletion if book member without edit permission", async () => {
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
                status: UserStatus.Registered,
            },
        ],
    });

    const res = await request(app)
        .delete(BookEndpoint.deleteBookRecipe(book.bookId, bookRecipe.recipeId))
        .set(token)
        .send();

    expect(res.statusCode).toEqual(403);
});

test("should allow deletion if book member with edit permission", async () => {
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

test("should allow deletion if book owner", async () => {
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

test("should delete recipe only from specified book", async () => {
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
