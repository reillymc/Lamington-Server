import { Table } from "./lamington";

/**
 * Ingredient
 */
export interface Ingredient {
    id: string;
    name: string;
    namePlural: string | undefined;
    notes: string | undefined;
}

export const ingredient: Table<Ingredient> = {
    id: "ingredient.id",
    name: "ingredient.name",
    namePlural: "ingredient.namePlural",
    notes: "ingredient.notes",
} as const;
