import db, { DeleteService, lamington, Meal, plannerMeal, ReadService, SaveService } from "../database";
import { EnsureArray } from "../utils";

export type PlannerMeal = Pick<
    Meal,
    "id" | "plannerId" | "year" | "month" | "dayOfMonth" | "meal" | "description" | "recipeId" | "createdBy"
> & { plannerId: string; year: number; month: number; dayOfMonth: number };

/**
 * Get planner meals by id or ids
 * @returns an array of planner meals matching given ids, filtered by year and month
 */
const readPlannerMeals: ReadService<PlannerMeal, "plannerId" | "year" | "month"> = async params => {
    const planners = EnsureArray(params);

    const response: PlannerMeal[] = [];
    for (const planner of planners) {
        const plannerItem = await db<PlannerMeal>(lamington.plannerMeal)
            .where(plannerMeal.plannerId, planner.plannerId)
            .andWhere(plannerMeal.year, planner.year)
            .andWhere(plannerMeal.month, planner.month)
            .orWhere(plannerMeal.month, planner.month - 1)
            .andWhere(plannerMeal.dayOfMonth, ">=", 21)
            .orWhere(plannerMeal.month, planner.month + 1)
            .andWhere(plannerMeal.dayOfMonth, "<=", 7);

        response.push(...plannerItem);
    }

    return response;
};

/**
 * Saves planner meals from params
 * @returns the newly created planners
 */
const savePlannerMeals: SaveService<PlannerMeal> = async params => {
    const meals = EnsureArray(params);

    await db(lamington.plannerMeal).insert(meals).onConflict([plannerMeal.plannerId, plannerMeal.id]).merge();

    return [];
};

/**
 * Creates a new planner from params
 * @returns the newly created planners
 */
const deletePlannerMeals: DeleteService<PlannerMeal, "id"> = async params => {
    return db(lamington.plannerMeal).whereIn(plannerMeal.id, EnsureArray(params)).delete();
};

export const PlannerMealActions = {
    save: savePlannerMeals,
    delete: deletePlannerMeals,
    read: readPlannerMeals,
};

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
