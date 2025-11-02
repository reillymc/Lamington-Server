import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

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
