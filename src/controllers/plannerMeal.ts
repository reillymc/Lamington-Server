import { content, type Content } from "../database/definitions/content.ts";
import db, { lamington, plannerMeal, type ReadService } from "../database/index.ts";
import { EnsureArray } from "../utils/index.ts";
import { type PlannerMealService } from "./spec/index.ts";
import type { PlannerMeal } from "./spec/plannerMeal.ts";

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
            .andWhere(plannerMeal.dayOfMonth, "<=", 7)
            .leftJoin(lamington.content, content.contentId, plannerMeal.mealId)
            .select("planner_meal.*", content.createdBy);

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

    // const result = await db.transaction(async trx => {
    await db<Content>(lamington.content)
        .insert(
            meals.map(({ mealId, createdBy }) => ({
                contentId: mealId,
                createdBy,
            }))
        )
        .onConflict("contentId")
        .merge();

    const result = await db<PlannerMeal>(lamington.plannerMeal)
        .insert(
            meals.map(({ mealId, dayOfMonth, meal, month, plannerId, year, description, recipeId, source }) => ({
                mealId,
                dayOfMonth,
                meal,
                month,
                plannerId,
                year,
                description,
                recipeId,
                source,
            }))
        )
        .onConflict("mealId") // TODO: can this now overwrite other users items on conflict?
        .merge()
        .returning(["mealId"]);

    return db(lamington.plannerMeal)
        .select("planner_meal.*", "content.createdBy", "content.createdAt")
        .whereIn(
            "mealId",
            result.map(item => item.mealId)
        )
        .join(lamington.content, plannerMeal.mealId, "content.contentId");
    // });

    // return result;
};

/**
 * Creates a new planner from params
 * @returns the newly created planners
 */
const deletePlannerMeals: PlannerMealService["Delete"] = async params => {
    const plannerMeals = EnsureArray(params).map(({ mealId }) => mealId);

    return db<Content>(lamington.content).whereIn(content.contentId, plannerMeals).delete();
};

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

    const query = db<PlannerMeal>(lamington.plannerMeal)
        .whereIn(plannerMeal.plannerId, plannerIds)
        .leftJoin(lamington.content, content.contentId, plannerMeal.mealId)
        .select("planner_meal.*", "content.createdBy");

    return query;
};

export const InternalPlannerMealActions = {
    readAll: readAllPlannerMeals,
};
