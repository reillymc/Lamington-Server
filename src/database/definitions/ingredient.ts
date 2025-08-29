import type { Table } from "./index.ts";

/**
 * Ingredient
 */
export interface Ingredient {
    ingredientId: string;
    name: string;
    description: string | undefined;
    photo: string | undefined;
    createdBy: string | undefined;
}

export const ingredient: Table<Ingredient> = {
    ingredientId: "ingredient.ingredientId",
    name: "ingredient.name",
    description: "ingredient.description",
    photo: "ingredient.photo",
    createdBy: "ingredient.createdBy",
} as const;
