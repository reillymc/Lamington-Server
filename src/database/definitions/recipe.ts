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

    /**
     * JSON blob with data on unit and number or number range.
     */
    servings?: string;
    prepTime?: number;
    cookTime?: number;
    nutritionalInformation?: string;
    summary?: string;
    tips?: string;
    public: boolean;
    timesCooked?: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export type RecipeTable = Table<Recipe>;

export const recipe: RecipeTable = {
    recipeId: `${lamington.recipe}.recipeId`,
    name: `${lamington.recipe}.name`,
    source: `${lamington.recipe}.source`,
    summary: `${lamington.recipe}.summary`,
    tips: `${lamington.recipe}.tips`,
    photo: `${lamington.recipe}.photo`,
    servings: `${lamington.recipe}.servings`,
    prepTime: `${lamington.recipe}.prepTime`,
    cookTime: `${lamington.recipe}.cookTime`,
    nutritionalInformation: `${lamington.recipe}.nutritionalInformation`,
    public: `${lamington.recipe}.public`,
    createdBy: `${lamington.recipe}.createdBy`,
    timesCooked: `${lamington.recipe}.timesCooked`,
    createdAt: `${lamington.recipe}.createdAt`,
    updatedAt: `${lamington.recipe}.updatedAt`,
} as const;
