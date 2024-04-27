import { Table } from ".";
import { lamington } from "./lamington";

/**
 * RecipeNote
 *
 * Contains notes left by users on recipes over time.
 */

export interface RecipeNote {
    recipeId: string;
    authorId: string;
    content?: number;
    public?: number;
    updatedAt: string;
    createdAt: string;
}

export const recipeNote: Table<RecipeNote> = {
    recipeId: `${lamington.recipeRating}.recipeId`,
    authorId: `${lamington.recipeRating}.authorId`,
    content: `${lamington.recipeRating}.content`,
    public: `${lamington.recipeRating}.public`,
    updatedAt: `${lamington.recipeRating}.updatedAt`,
    createdAt: `${lamington.recipeRating}.createdAt`,
};
