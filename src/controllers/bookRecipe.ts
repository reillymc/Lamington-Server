import db, {
    bookRecipe,
    type BookRecipe,
    type CreateQuery,
    type CreateResponse,
    type DeleteResponse,
    lamington,
    type ReadQuery,
    type ReadResponse,
} from "../database/index.ts";
import { EnsureArray } from "../utils/index.ts";

interface GetBookRecipesParams {
    bookId: string;
}

/**
 * Get books by id or ids
 * @returns an array of books matching given ids
 */
const readBookRecipes = async (params: ReadQuery<GetBookRecipesParams>): ReadResponse<BookRecipe> => {
    const bookIds = EnsureArray(params).map(({ bookId }) => bookId);

    return db<BookRecipe>(lamington.bookRecipe)
        .select(bookRecipe.bookId, bookRecipe.recipeId)
        .whereIn(bookRecipe.bookId, bookIds);
};

/**
 * Creates a new book from params
 * @returns the newly created books
 */
const createBookRecipes = async (params: CreateQuery<BookRecipe>): CreateResponse<BookRecipe> => {
    const bookRecipes = EnsureArray(params);

    return await db<BookRecipe>(lamington.bookRecipe)
        .insert(bookRecipes)
        .onConflict(["bookId", "recipeId"])
        .merge()
        .returning(["bookId", "recipeId"]);
};

/**
 * Creates a new book from params
 * @returns the newly created books
 */
const deleteBookRecipes = async (params: CreateQuery<BookRecipe>): DeleteResponse => {
    const bookRecipes = EnsureArray(params).map(({ bookId, recipeId }) => [bookId, recipeId]);

    return db<BookRecipe>(lamington.bookRecipe).whereIn(["bookId", "recipeId"], bookRecipes).delete();
};

export const BookRecipeActions = {
    save: createBookRecipes,
    delete: deleteBookRecipes,
    read: readBookRecipes,
};

export type BookRecipeActions = typeof BookRecipeActions;
