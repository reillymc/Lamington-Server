import type { Table } from "./index.ts";

/**
 * Ingredient
 */
export interface Ingredient {
    ingredientId: string;
    name: string;
    description: string | undefined;
}

export const ingredient: Table<Ingredient> = {
    ingredientId: "ingredient.ingredientId",
    name: "ingredient.name",
    description: "ingredient.description",
} as const;
