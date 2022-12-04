import { lamington, Table } from ".";

/**
 * RecipeRating
 *
 * Contains the mapping of each of the recipe's ratings to the rater and the rating
 */

export interface RecipeRating {
    recipeId: string;
    raterId: string;
    rating: number;
}

export const recipeRating: Table<RecipeRating> = {
    recipeId: `${lamington.recipeRating}.recipeId`,
    raterId: `${lamington.recipeRating}.raterId`,
    rating: `${lamington.recipeRating}.rating`,
};
