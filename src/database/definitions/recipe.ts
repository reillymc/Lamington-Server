import { lamington, Table } from ".";

/**
 * Recipe
 */
export interface Recipe {
    recipeId: string;
    name: string;
    source: string | undefined;
    photo: string | undefined;
    servings: number | undefined;
    prepTime: number | undefined;
    cookTime: number | undefined;
    notes: string | undefined;
    public: number;
    timesCooked: number | undefined;
    createdBy: string;
}

export type RecipeTable = Table<Recipe>;

export const recipe: RecipeTable = {
    recipeId: `${lamington.recipe}.recipeId`,
    name: `${lamington.recipe}.name`,
    source: `${lamington.recipe}.source`,
    notes: `${lamington.recipe}.notes`,
    photo: `${lamington.recipe}.photo`,
    servings: `${lamington.recipe}.servings`,
    prepTime: `${lamington.recipe}.prepTime`,
    cookTime: `${lamington.recipe}.cookTime`,
    public: `${lamington.recipe}.public`,
    createdBy: `${lamington.recipe}.createdBy`,
    timesCooked: `${lamington.recipe}.timesCooked`,
} as const;
