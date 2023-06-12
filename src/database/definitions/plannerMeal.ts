import { Table } from ".";
import { lamington } from "./lamington";

/**
 * PlannerMeal
 */
export type PlannerMeal = {
    id: string;
    plannerId: string;
    createdBy: string;
    year: number | undefined;
    month: number | undefined;
    dayOfMonth: number | undefined;
    meal: string;
    description: string | undefined;
    recipeId: string | undefined;
};

export const plannerMeal: Table<PlannerMeal> = {
    id: `${lamington.plannerMeal}.id`,
    plannerId: `${lamington.plannerMeal}.plannerId`,
    createdBy: `${lamington.plannerMeal}.createdBy`,
    year: `${lamington.plannerMeal}.year`,
    month: `${lamington.plannerMeal}.month`,
    dayOfMonth: `${lamington.plannerMeal}.dayOfMonth`,
    meal: `${lamington.plannerMeal}.meal`,
    description: `${lamington.plannerMeal}.description`,
    recipeId: `${lamington.plannerMeal}.recipeId`,
} as const;
