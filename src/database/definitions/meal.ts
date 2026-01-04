import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

/**
 * Meal
 */
export type Meal = {
    mealId: string;
    plannerId: string | null;
    year: number | null;
    month: number | null;
    dayOfMonth: number | null;
    meal: string;
    description: string | null;
    source: string | null;
    sequence: number | null;
    recipeId: string | null;
    notes: string | null;
};

export const plannerMealColumns = [
    "mealId",
    "plannerId",
    "year",
    "month",
    "dayOfMonth",
    "meal",
    "description",
    "source",
    "sequence",
    "recipeId",
    "notes",
] as const satisfies (keyof Meal)[];

export const plannerMeal = Object.fromEntries(
    plannerMealColumns.map(column => [column, `${lamington.plannerMeal}.${column}`])
) as Table<Meal>;
