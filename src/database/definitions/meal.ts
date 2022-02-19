import { Table } from "./lamington";

/**
 * Meal
 */
 export interface Meal {
    id: string;
    name: string;
    source: string | undefined;
    photo: string | undefined;
    servings: number | undefined;
    prepTime: number | undefined;
    cookTime: number | undefined;
    notes: string | undefined;
    timesCooked: number | undefined;
    createdBy: string;
}

export const meal: Table<Meal> = {
    id: "meal.id",
    name: "meal.name",
    source: "meal.source",
    notes: "meal.notes",
    photo: "meal.photo",
    servings: "meal.servings",
    prepTime: "meal.prepTime",
    cookTime: "meal.cookTime",
    createdBy: "meal.createdBy",
    timesCooked: "meal.timesCooked",
} as const;
