import { lamington, Table } from ".";

/**
 * RecipeCategory
 *
 * Contains the mapping of each of the recipe's categories
 */
export interface RecipeCategory {
    recipeId: string;
    categoryId: string;
}

export const recipeCategory: Table<RecipeCategory> = {
    recipeId: `${lamington.recipeCategory}.recipeId`,
    categoryId: `${lamington.recipeCategory}.categoryId`,
};
