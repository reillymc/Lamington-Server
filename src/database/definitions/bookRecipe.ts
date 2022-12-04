import { lamington, Table } from ".";

/**
 * BookRecipe
 */
export type BookRecipe = {
    bookId: string;
    recipeId: string;
};

export const bookRecipe: Table<BookRecipe> = {
    bookId: `${lamington.bookRecipe}.bookId`,
    recipeId: `${lamington.bookRecipe}.recipeId`,
} as const;
