import db, { DeleteService, lamington, Meal, plannerMeal, ReadMyService, SaveService, ReadService } from "../database";
import { EnsureArray } from "../utils";

export type CookListMeal = Pick<Meal, "id" | "meal" | "description" | "createdBy" | "recipeId" | "source" | "sequence">;

/**
 * Get cook list meals by user id
 *
 * Secure - no additional route authentication check required
 * @returns an array of queued cook list meals (no dates assigned) matching given ids,
 */
const readMyMeals: ReadMyService<CookListMeal> = async params => {
    const query = db<CookListMeal>(lamington.plannerMeal)
        .select(
            plannerMeal.id,
            plannerMeal.meal,
            plannerMeal.description,
            plannerMeal.createdBy,
            plannerMeal.recipeId,
            plannerMeal.source,
            plannerMeal.sequence
        )
        .where(plannerMeal.createdBy, params.userId)
        .whereNull(plannerMeal.plannerId)
        .whereNull(plannerMeal.year)
        .whereNull(plannerMeal.month);
    return query;
};

type SaveMealsParams = Exclude<Parameters<CookListMealActions["save"]>[0], any[]>;

/**
 * Creates new cook list meals or updates existing ones
 *
 * Insecure - route authentication check required (user save permission on meals)
 * @returns number of rows created/updated
 */
const saveMeals: SaveService<CookListMeal> = async params => {
    const meals = EnsureArray(params);

    await db(lamington.plannerMeal).insert(meals).onConflict([plannerMeal.id]).merge();

    return [];
};

/**
 * Deletes cook list meals
 *
 * Insecure - route authentication check required (user delete permission on meals)
 * @returns the number of rows deleted
 */
const deleteMeals: DeleteService<CookListMeal, "id"> = async params => {
    return db(lamington.plannerMeal).whereIn(plannerMeal.id, EnsureArray(params)).delete();
};

/**
 * Get cook List meals by id
 *
 * Insecure - route authentication check required (user read permission on meals)
 * @returns an array of queued cook list meals matching given ids,
 */
const readMeals: ReadService<CookListMeal, "id"> = async params => {
    const mealIds = EnsureArray(params).map(({ id }) => id);
    const query = db<CookListMeal>(lamington.plannerMeal)
        .select(
            plannerMeal.id,
            plannerMeal.meal,
            plannerMeal.description,
            plannerMeal.createdBy,
            plannerMeal.recipeId,
            plannerMeal.source,
            plannerMeal.sequence
        )
        .whereIn(plannerMeal.id, mealIds)
        .whereNull(plannerMeal.plannerId)
        .whereNull(plannerMeal.year)
        .whereNull(plannerMeal.month);
    return query;
};

export const CookListMealActions = {
    save: saveMeals,
    delete: deleteMeals,
    readMy: readMyMeals,
};

export type CookListMealActions = typeof CookListMealActions;

export const CookListMealActionsInternal = {
    read: readMeals,
};
