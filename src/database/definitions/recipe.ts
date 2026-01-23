import type { Content } from "./content.ts";
import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

export type NumberValue = { representation: "number"; value: string };
export type RangeValue = { representation: "range"; value: [string, string] };
export type FractionValue = {
    representation: "fraction";
    value: [string, string, string];
};

type RecipeServingsV1 = {
    unit: string;
    count: RangeValue | NumberValue | FractionValue;
};

export type RecipeServings = RecipeServingsV1;

/**
 * Recipe
 */
export interface Recipe {
    recipeId: Content["contentId"];
    name: string;
    source?: string;
    servings?: RecipeServings;
    prepTime?: number;
    cookTime?: number;
    nutritionalInformation?: string;
    summary?: string;
    tips?: string;
    public: boolean;
    timesCooked?: number;
}

export type RecipeTable = Table<Recipe>;

export const recipe: RecipeTable = {
    recipeId: `${lamington.recipe}.recipeId`,
    name: `${lamington.recipe}.name`,
    source: `${lamington.recipe}.source`,
    summary: `${lamington.recipe}.summary`,
    tips: `${lamington.recipe}.tips`,
    servings: `${lamington.recipe}.servings`,
    prepTime: `${lamington.recipe}.prepTime`,
    cookTime: `${lamington.recipe}.cookTime`,
    nutritionalInformation: `${lamington.recipe}.nutritionalInformation`,
    public: `${lamington.recipe}.public`,
    timesCooked: `${lamington.recipe}.timesCooked`,
} as const;
