import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

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
