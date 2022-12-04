import { lamington, Table } from ".";

/**
 * BookMeal
 */
export type BookMeal = {
    bookId: string;
    mealId: string;
};

export const bookMeal: Table<BookMeal> = {
    bookId: `${lamington.bookMeal}.bookId`,
    mealId: `${lamington.bookMeal}.mealId`,
} as const;
