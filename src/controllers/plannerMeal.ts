import db, {
    CreateQuery,
    CreateResponse,
    DeleteResponse,
    lamington,
    PlannerMeal,
    plannerMeal,
    ReadQuery,
    ReadResponse,
} from "../database";

interface GetPlannerMealsParams {
    plannerId: string;
}

/**
 * Get planners by id or ids
 * @returns an array of planners matching given ids
 */
const readPlannerMeals = async (params: ReadQuery<GetPlannerMealsParams>): ReadResponse<PlannerMeal> => {
    if (!Array.isArray(params)) {
        params = [params];
    }
    const plannerIds = params.map(({ plannerId }) => plannerId);

    const query = db<PlannerMeal>(lamington.plannerMeal)
        .select(plannerMeal.plannerId, plannerMeal.recipeId)
        .whereIn(plannerMeal.plannerId, plannerIds);
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
        .onConflict([plannerMeal.plannerId, plannerMeal.recipeId])
        .merge();

    return result;
};

/**
 * Creates a new planner from params
 * @returns the newly created planners
 */
const deletePlannerMeals = async (plannerMeals: CreateQuery<{ id: string }>): DeleteResponse => {
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
};
