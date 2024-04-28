import db, { lamington, Meal, plannerMeal, ReadService } from "../database";
import { EnsureArray } from "../utils";
import { PlannerMealService } from "./spec";

export type PlannerMeal = Pick<
    Meal,
    "id" | "plannerId" | "year" | "month" | "dayOfMonth" | "meal" | "description" | "recipeId" | "createdBy" | "source"
> & { plannerId: string; year: number; month: number; dayOfMonth: number };

/**
 * Get planner meals by id or ids
 * @returns an array of planner meals matching given ids, filtered by year and month
 */
const readPlannerMeals: PlannerMealService["Read"] = async params => {
    const planners = EnsureArray(params);

    const response: PlannerMeal[] = [];
    for (const planner of planners) {
        // Include the previous and next month in addition to the current month to avoid overlap issues
        // on first/last weeks of the month
        const previousMonth = (planner.month + 11) % 12;
        const nextMonth = (planner.month + 1) % 12;

        const plannerItem = await db<PlannerMeal>(lamington.plannerMeal)
            .where(plannerMeal.plannerId, planner.plannerId)
            .andWhere(plannerMeal.year, planner.year)
            .andWhere(plannerMeal.month, planner.month)
            .orWhere(plannerMeal.month, previousMonth)
            .andWhere(plannerMeal.dayOfMonth, ">=", 21)
            .orWhere(plannerMeal.month, nextMonth)
            .andWhere(plannerMeal.dayOfMonth, "<=", 7);

        response.push(...plannerItem);
    }

    return response;
};

/**
 * Saves planner meals from params
 * @returns the newly created planners
 */
const savePlannerMeals: PlannerMealService["Save"] = async params => {
    const meals = EnsureArray(params);

    return db<PlannerMeal>(lamington.plannerMeal).insert(meals).onConflict("id").merge().returning("id");
};

/**
 * Creates a new planner from params
 * @returns the newly created planners
 */
const deletePlannerMeals: PlannerMealService["Delete"] = async params =>
    db(lamington.plannerMeal)
        .whereIn(
            plannerMeal.id,
            EnsureArray(params).map(({ id }) => id)
        )
        .delete();

export const PlannerMealActions: PlannerMealService = {
    /**
     * Deletes meals by meal ids
     * @security Insecure: route authentication check required (user delete permission on meals)
     */
    Delete: deletePlannerMeals,

    /**
     * Get planner meals by id or ids
     * @security Insecure: no authentication checks required
     * @returns an array of meals matching given ids
     */
    Read: readPlannerMeals,

    /**
     * Creates or Saves a new list from params
     * @security Insecure: route authentication check required (user save permission on meals)
     * @returns the newly created meals
     */
    Save: savePlannerMeals,
};

export type PlannerMealActions = typeof PlannerMealActions;

/**
 * Get planner meals by id or ids
 * @returns an array of planners matching given ids
 */
const readAllPlannerMeals: ReadService<PlannerMeal, "plannerId"> = async params => {
    const plannerIds = EnsureArray(params).map(({ plannerId }) => plannerId);

    const query = db<PlannerMeal>(lamington.plannerMeal).whereIn(plannerMeal.plannerId, plannerIds);

    return query;
};

export const InternalPlannerMealActions = {
    readAll: readAllPlannerMeals,
};
