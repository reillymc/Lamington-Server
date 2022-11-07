import { Table } from "./lamington";

/**
 * Meal
 */
 export interface Meal {
    mealId: string;
    name: string  | undefined;
    source: string | undefined;
    photo: string | undefined;
    servings: number | undefined;
    prepTime: number | undefined;
    cookTime: number | undefined;
    notes: string | undefined;
    timesCooked: number | undefined;
    createdBy: string;
}

export type MealTable = Table<Meal>;

export const meal: MealTable = {
    mealId: "meal.mealId",
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