import { Table } from ".";
import { lamington } from "./lamington";

/**
 * RecipeStep
 *
 * Contains the mapping of each of the recipe's steps in its method to a unique id with its associated properties
 */

export interface RecipeStepProperties {}

export interface RecipeStep {
    id: string;
    recipeId: string;
    sectionId: string | undefined;
    index: number;
    description: string | undefined;
    photo: string | undefined;
}

export const recipeStep: Table<RecipeStep> = {
    id: `${lamington.recipeStep}.id`,
    recipeId: `${lamington.recipeStep}.recipeId`,
    sectionId: `${lamington.recipeStep}.sectionId`,
    index: `${lamington.recipeStep}.index`,
    description: `${lamington.recipeStep}.description`,
    photo: `${lamington.recipeStep}.photo`,
};
