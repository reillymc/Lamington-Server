import { Table } from ".";
import { lamington } from "./lamington";

/**
 * Meal
 */
export type Meal = {
    id: string;
    plannerId?: string;
    createdBy: string;
    year?: number;
    month?: number;
    dayOfMonth?: number;
    meal: string;
    description?: string;
    source?: string;
    sequence?: number;
    recipeId?: string;
};

export const plannerMeal: Table<Meal> = {
    id: `${lamington.plannerMeal}.id`,
    plannerId: `${lamington.plannerMeal}.plannerId`,
    createdBy: `${lamington.plannerMeal}.createdBy`,
    year: `${lamington.plannerMeal}.year`,
    month: `${lamington.plannerMeal}.month`,
    dayOfMonth: `${lamington.plannerMeal}.dayOfMonth`,
    meal: `${lamington.plannerMeal}.meal`,
    description: `${lamington.plannerMeal}.description`,
    source: `${lamington.plannerMeal}.source`,
    sequence: `${lamington.plannerMeal}.sequence`,
    recipeId: `${lamington.plannerMeal}.recipeId`,
} as const;
