import db, { CreateQuery, CreateResponse, DeleteResponse, lamington, PlannerMeal, plannerMeal } from "../database";

interface ReadPlannerMealsParams {
    plannerId: string;
    year: number;
    month: number;
}

/**
 * Get planner meals by id or ids
 * @returns an array of planner meals matching given ids, filtered by year and month
 */
const readPlannerMeals = async (params: ReadPlannerMealsParams): Promise<PlannerMeal[]> => {
    const query = db<PlannerMeal>(lamington.plannerMeal)
        .where(plannerMeal.plannerId, params.plannerId)
        .andWhere(plannerMeal.year, params.year)
        .andWhere(plannerMeal.month, params.month)
        .orWhere(plannerMeal.month, params.month - 1)
        .andWhere(plannerMeal.dayOfMonth, ">=", 21)
        .orWhere(plannerMeal.month, params.month + 1)
        .andWhere(plannerMeal.dayOfMonth, "<=", 7);

    return query;
};

/**
 * Get planner meal queue by id or ids
 * @returns an array of queued planner meals (no dates assigned) matching given ids,
 */
const readPlannerMealQueue = async (params: Pick<PlannerMeal, "plannerId">): Promise<PlannerMeal[]> => {
    const query = db<PlannerMeal>(lamington.plannerMeal)
        .where(plannerMeal.plannerId, params.plannerId)
        .whereNull(plannerMeal.year)
        .whereNull(plannerMeal.month);
    return query;
};

/**
 * Creates a new planner from params
 * @returns the newly created planners
 */
const createPlannerMeals = async (plannerMeals: CreateQuery<PlannerMeal>): CreateResponse<number> => {
    if (!Array.isArray(plannerMeals)) {
        plannerMeals = [plannerMeals];
    }

    const result = await db(lamington.plannerMeal)
        .insert(plannerMeals)
        .onConflict([plannerMeal.plannerId, plannerMeal.id])
        .merge();

    return result;
};

/**
 * Creates a new planner from params
 * @returns the newly created planners
 */
const deletePlannerMeals = async (plannerMeals: CreateQuery<Pick<PlannerMeal, "id">>): DeleteResponse => {
    if (!Array.isArray(plannerMeals)) {
        plannerMeals = [plannerMeals];
    }

    const ids = plannerMeals.map(({ id }) => id);

    return db(lamington.plannerMeal).whereIn(plannerMeal.id, ids).delete();
};

export const PlannerMealActions = {
    save: createPlannerMeals,
    delete: deletePlannerMeals,
    read: readPlannerMeals,
    readQueue: readPlannerMealQueue,
};

/**
 * Get planner meals by id or ids
 * @returns an array of planners matching given ids
 */
const readAllPlannerMeals = async (params: Pick<PlannerMeal, "plannerId">): Promise<PlannerMeal[]> => {
    const query = db<PlannerMeal>(lamington.plannerMeal).where(plannerMeal.plannerId, params.plannerId);

    return query;
};

export const InternalPlannerMealActions = {
    readAll: readAllPlannerMeals,
};
