import db, {
    bookRecipe,
    BookRecipe,
    CreateQuery,
    CreateResponse,
    DeleteResponse,
    lamington,
    ReadQuery,
    ReadResponse,
} from "../database";

interface GetBookRecipesParams {
    bookId: string;
}

/**
 * Get books by id or ids
 * @returns an array of books matching given ids
 */
const readBookRecipes = async (params: ReadQuery<GetBookRecipesParams>): ReadResponse<BookRecipe> => {
    if (!Array.isArray(params)) {
        params = [params];
    }
    const bookIds = params.map(({ bookId }) => bookId);

    const query = db<BookRecipe>(lamington.bookRecipe)
        .select(bookRecipe.bookId, bookRecipe.recipeId)
        .whereIn(bookRecipe.bookId, bookIds);
    return query;
};

/**
 * Creates a new book from params
 * @returns the newly created books
 */
const createBookRecipes = async (bookRecipes: CreateQuery<BookRecipe>): CreateResponse<number> => {
    if (!Array.isArray(bookRecipes)) {
        bookRecipes = [bookRecipes];
    }

    const result = await db(lamington.bookRecipe)
        .insert(bookRecipes)
        .onConflict([bookRecipe.bookId, bookRecipe.recipeId])
        .merge();

    return result;
};

/**
 * Creates a new book from params
 * @returns the newly created books
 */
const deleteBookRecipes = async (bookRecipes: CreateQuery<BookRecipe>): DeleteResponse => {
    if (!Array.isArray(bookRecipes)) {
        bookRecipes = [bookRecipes];
    }

    const bookIds = bookRecipes.map(({ bookId }) => bookId);
    const recipeIds = bookRecipes.map(({ recipeId }) => recipeId);

    return db(lamington.bookRecipe)
        .whereIn(bookRecipe.bookId, bookIds)
        .and.whereIn(bookRecipe.recipeId, recipeIds)
        .delete();
};

export const BookRecipeActions = {
    save: createBookRecipes,
    delete: deleteBookRecipes,
    read: readBookRecipes,
};
