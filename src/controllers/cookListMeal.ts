import db, { DeleteService, Meal, ReadMyService, ReadService, SaveService, lamington, plannerMeal } from "../database";
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

/**
 * Creates new cook list meals or updates existing ones
 *
 * Insecure - route authentication check required (user save permission on meals)
 */
const saveMeals: SaveService<CookListMeal> = async params => {
    const meals = EnsureArray(params);

    return db<Meal>(lamington.plannerMeal).insert(meals).onConflict(["id"]).merge().returning("id");
};

/**
 * Deletes cook list meals
 *
 * Insecure - route authentication check required (user delete permission on meals)
 * @returns the number of rows deleted
 */
const deleteMeals: DeleteService<CookListMeal, "id"> = async params =>
    db<Meal>(lamington.plannerMeal)
        .whereIn(
            "id",
            EnsureArray(params).map(({ id }) => id)
        )
        .delete();

/**
 * Get cook List meals by id
 *
 * Insecure - route authentication check required (user read permission on meals)
 * @returns an array of queued cook list meals matching given ids,
 */
const readMeals: ReadService<CookListMeal, "id"> = async params => {
    const mealIds = EnsureArray(params).map(({ id }) => id);
    return db<Meal>(lamington.plannerMeal)
        .select("id", "meal", "description", "createdBy", "recipeId", "source", "sequence")
        .whereIn("id", mealIds)
        .whereNull("plannerId")
        .whereNull("year")
        .whereNull("month");
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
