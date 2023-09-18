import { Table } from ".";
import { lamington } from "./lamington";

/**
 * Recipe
 */
export interface Recipe {
    recipeId: string;
    name: string;
    source?: string;
    photo?: string;
    servingsLower?: number;
    servingsUpper?: number;
    prepTime?: number;
    cookTime?: number;
    summary?: string;
    tips?: string;
    public: number;
    timesCooked?: number;
    createdBy: string;
    dateCreated: string;
    dateUpdated: string;
}

export type RecipeTable = Table<Recipe>;

export const recipe: RecipeTable = {
    recipeId: `${lamington.recipe}.recipeId`,
    name: `${lamington.recipe}.name`,
    source: `${lamington.recipe}.source`,
    summary: `${lamington.recipe}.summary`,
    tips: `${lamington.recipe}.tips`,
    photo: `${lamington.recipe}.photo`,
    servingsLower: `${lamington.recipe}.servingsLower`,
    servingsUpper: `${lamington.recipe}.servingsUpper`,
    prepTime: `${lamington.recipe}.prepTime`,
    cookTime: `${lamington.recipe}.cookTime`,
    public: `${lamington.recipe}.public`,
    createdBy: `${lamington.recipe}.createdBy`,
    timesCooked: `${lamington.recipe}.timesCooked`,
    dateCreated: `${lamington.recipe}.dateCreated`,
    dateUpdated: `${lamington.recipe}.dateUpdated`,
} as const;
