import { Table } from "./lamington";

/**
 * Ingredient
 */
export interface Ingredient {
    ingredientId: string;
    name: string;
    namePlural: string | undefined;
    description: string | undefined;
    photo: string | undefined;
}

export const ingredient: Table<Ingredient> = {
    ingredientId: "ingredient.ingredientId",
    name: "ingredient.name",
    namePlural: "ingredient.namePlural",
    description: "ingredient.description",
    photo: "ingredient.photo",
} as const;
