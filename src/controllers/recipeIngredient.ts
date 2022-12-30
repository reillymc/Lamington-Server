import db, { Ingredient, RecipeIngredient, lamington, recipeIngredient, ingredient, ReadResponse } from "../database";
import { Undefined } from "../utils";

/**
 * Delete all RecipeIngredient rows for specified recipeId EXCEPT for the list of ingredient ids provided
 * @param recipeId recipe to run operation on
 * @param retainedIds ingredients to keep
 * @returns
 */
const deleteExcessRows = async (recipeId: string, retainedIds: string[]) =>
    db(lamington.recipeIngredient)
        .where({ [recipeIngredient.recipeId]: recipeId })
        .whereNotIn(recipeIngredient.id, retainedIds)
        .delete();

/**
 * Create RecipeIngredients provided
 * @param recipeIngredients
 * @returns
 */
const insertRows = async (recipeIngredients: RecipeIngredient[]) =>
    db(lamington.recipeIngredient).insert(recipeIngredients).onConflict([recipeIngredient.id]).merge();

/**
 * Update RecipeIngredients for recipeId, by deleting all ingredients not in ingredient list and then creating / updating provided ingredients in list
 * @param recipeId recipe to modify
 * @param recipeIngredients ingredients to include in recipe
 */
const save = async (recipeId: string, recipeIngredients: RecipeIngredient[]) => {
    const ingredientIds = recipeIngredients.map(({ id }) => id).filter(Undefined);
    console.log(ingredientIds);

    await deleteExcessRows(recipeId, ingredientIds);
    await insertRows(recipeIngredients);
};

export type IngredientReadByRecipeIdResponse = Omit<RecipeIngredient, "recipeId"> & Pick<Ingredient, "name">;

/**
 * Get all ingredients for a recipe
 * @param recipeId recipe to retrieve ingredients from
 * @returns RecipeIngredientsResults
 */
const readByRecipeId = async (recipeId: string): ReadResponse<IngredientReadByRecipeIdResponse> =>
    db(lamington.recipeIngredient)
        .where({ [recipeIngredient.recipeId]: recipeId })
        .select(
            recipeIngredient.id,
            recipeIngredient.ingredientId,
            ingredient.name,
            recipeIngredient.sectionId,
            recipeIngredient.index,
            recipeIngredient.description,
            recipeIngredient.unit,
            recipeIngredient.amount,
            recipeIngredient.multiplier
        )
        .join(lamington.ingredient, recipeIngredient.ingredientId, ingredient.ingredientId);

export const RecipeIngredientActions = {
    readByRecipeId,
    save,
};
