import { Table } from ".";
import { lamington } from "./lamington";

/**
 * RecipeTag
 *
 * Contains the mapping of each of the recipe's tags.
 */
export interface RecipeTag {
    recipeId: string;
    tagId: string;
}

export const recipeTag: Table<RecipeTag> = {
    recipeId: `${lamington.recipeTag}.recipeId`,
    tagId: `${lamington.recipeTag}.tagId`,
};
