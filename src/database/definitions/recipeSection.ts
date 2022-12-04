import { lamington, Table } from ".";

/**
 * RecipeSection
 */

export const DefaultSection = "default" as const;

export interface RecipeSection {
    recipeId: string;
    sectionId: string;
    index: number;
    name: string;
    description: string | undefined;
}

export const recipeSection: Table<RecipeSection> = {
    recipeId: `${lamington.recipeSection}.recipeId`,
    sectionId: `${lamington.recipeSection}.sectionId`,
    index: `${lamington.recipeSection}.index`,
    name: `${lamington.recipeSection}.name`,
    description: `${lamington.recipeSection}.description`,
};
