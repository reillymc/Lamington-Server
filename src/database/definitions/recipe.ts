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
    count: RangeValue | NumberValue;
};

export type RecipeServings = RecipeServingsV1;

/**
 * Recipe
 */
export interface Recipe {
    recipeId: Content["contentId"];
    name: string;
    source: string | null;
    servings: RecipeServings | null;
    prepTime: number | null;
    cookTime: number | null;
    nutritionalInformation: string | null;
    summary: string | null;
    tips: string | null;
    public: boolean;
    timesCooked: number | null;
}

export type RecipeTable = Table<Recipe>;

export const recipeColumns = [
    "recipeId",
    "name",
    "source",
    "summary",
    "tips",
    "servings",
    "prepTime",
    "cookTime",
    "nutritionalInformation",
    "public",
    "timesCooked",
] as const satisfies (keyof Recipe)[];

export const recipe = Object.fromEntries(
    recipeColumns.map((column) => [column, `${lamington.recipe}.${column}`]),
) as Table<Recipe>;
