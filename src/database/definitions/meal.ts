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

export const plannerMeal: Table<Meal> = {
    mealId: `${lamington.plannerMeal}.mealId`,
    plannerId: `${lamington.plannerMeal}.plannerId`,
    year: `${lamington.plannerMeal}.year`,
    month: `${lamington.plannerMeal}.month`,
    dayOfMonth: `${lamington.plannerMeal}.dayOfMonth`,
    meal: `${lamington.plannerMeal}.meal`,
    description: `${lamington.plannerMeal}.description`,
    source: `${lamington.plannerMeal}.source`,
    sequence: `${lamington.plannerMeal}.sequence`,
    recipeId: `${lamington.plannerMeal}.recipeId`,
    notes: `${lamington.plannerMeal}.notes`,
} as const;
