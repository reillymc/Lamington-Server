import db, { Ingredient, MealIngredient, lamington, mealIngredient, ingredient } from "../database";
import { Undefined } from "../utils";

/**
 * Delete all MealIngredient rows for specified mealId EXCEPT for the list of ingredient ids provided
 * @param mealId meal to run operation on
 * @param retainedIngredientIds ingredients to keep
 * @returns
 */
const deleteExcessRows = async (mealId: string, retainedIngredientIds: string[]) =>
    db(lamington.mealIngredient)
        .where({ [mealIngredient.mealId]: mealId })
        .whereNotIn(mealIngredient.ingredientId, retainedIngredientIds)
        .del();

/**
 * Create MealIngredients provided
 * @param mealIngredients
 * @returns
 */
const insertRows = async (mealIngredients: MealIngredient[]) =>
    db(lamington.mealIngredient)
        .insert(mealIngredients)
        .onConflict([mealIngredient.mealId, mealIngredient.ingredientId])
        .merge();

/**
 * Update MealIngredients for mealId, by deleting all ingredients not in ingredient list and then creating / updating provided ingredients in list
 * @param mealId meal to modify
 * @param mealIngredients ingredients to include in meal
 */
const updateRows = async (mealId: string, mealIngredients: MealIngredient[]) => {
    await deleteExcessRows(mealId, mealIngredients.map(({ ingredientId }) => ingredientId).filter(Undefined));
    await insertRows(mealIngredients);
};

type MealIngredientResults = Array<Omit<MealIngredient, "mealId"> & Pick<Ingredient, "name" | "namePlural">>;

/**
 * Get all ingredients for a meal
 * @param mealId meal to retrieve ingredients from
 * @returns MealIngredientsResults
 */
const selectByMealId = async (mealId: string): Promise<MealIngredientResults> =>
    db(lamington.mealIngredient)
        .where({ [mealIngredient.mealId]: mealId })
        .select(
            mealIngredient.ingredientId,
            ingredient.name,
            ingredient.namePlural,
            mealIngredient.sectionId,
            mealIngredient.index,
            mealIngredient.description,
            mealIngredient.unit,
            mealIngredient.amount,
            mealIngredient.multiplier
        )
        .join(lamington.ingredient, mealIngredient.ingredientId, ingredient.ingredientId);

const MealIngredientActions = {
    selectByMealId,
    updateRows,
};

export default MealIngredientActions;

export { deleteExcessRows, insertRows, selectByMealId, updateRows, MealIngredientResults };
