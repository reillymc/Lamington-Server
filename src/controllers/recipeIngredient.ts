import db, { Ingredient, RecipeIngredient, lamington, recipeIngredient, ingredient, ReadResponse } from "../database";
import { Undefined } from "../utils";

/**
 * Delete all RecipeIngredient rows for specified recipeId EXCEPT for the list of ingredient ids provided
 * @param recipeId recipe to run operation on
 * @param retainedIngredientIds ingredients to keep
 * @returns
 */
const deleteExcessRows = async (recipeId: string, retainedIngredientIds: string[]) =>
    db(lamington.recipeIngredient)
        .where({ [recipeIngredient.recipeId]: recipeId })
        .whereNotIn(recipeIngredient.ingredientId, retainedIngredientIds)
        .del();

/**
 * Create RecipeIngredients provided
 * @param recipeIngredients
 * @returns
 */
const insertRows = async (recipeIngredients: RecipeIngredient[]) =>
    db(lamington.recipeIngredient)
        .insert(recipeIngredients)
        .onConflict([recipeIngredient.recipeId, recipeIngredient.ingredientId])
        .merge();

/**
 * Update RecipeIngredients for recipeId, by deleting all ingredients not in ingredient list and then creating / updating provided ingredients in list
 * @param recipeId recipe to modify
 * @param recipeIngredients ingredients to include in recipe
 */
const updateRows = async (recipeId: string, recipeIngredients: RecipeIngredient[]) => {
    await deleteExcessRows(recipeId, recipeIngredients.map(({ ingredientId }) => ingredientId).filter(Undefined));
    await insertRows(recipeIngredients);
};

export type IngredientReadByRecipeIdResponse = Omit<RecipeIngredient, "recipeId"> &
    Pick<Ingredient, "name" | "namePlural">;

/**
 * Get all ingredients for a recipe
 * @param recipeId recipe to retrieve ingredients from
 * @returns RecipeIngredientsResults
 */
const readByRecipeId = async (recipeId: string): ReadResponse<IngredientReadByRecipeIdResponse> =>
    db(lamington.recipeIngredient)
        .where({ [recipeIngredient.recipeId]: recipeId })
        .select(
            recipeIngredient.ingredientId,
            ingredient.name,
            ingredient.namePlural,
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
    save: updateRows,
};
