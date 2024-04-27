import db, { lamington, ReadResponse, recipeStep, RecipeStep } from "../database";

/**
 * Delete all RecipeStep rows for specified recipeId EXCEPT for the list of step ids provided
 * @param recipeId recipe to run operation on
 * @param retainedStepIds steps to keep
 * @returns
 */
const deleteExcessRows = async (recipeId: string, retainedStepIds: string[]) =>
    db<RecipeStep>(lamington.recipeStep).where({ recipeId }).whereNotIn("id", retainedStepIds).del();

/**
 * Create RecipeSteps provided
 * @param recipeSteps
 * @returns
 */
const insertRows = async (recipeSteps: RecipeStep[]) =>
    db<RecipeStep>(lamington.recipeStep).insert(recipeSteps).onConflict(["recipeId", "id"]).merge();

/**
 * Update RecipeSteps for recipeId, by deleting all steps not in step list and then creating / updating provided steps in list
 * @param recipeId recipe to modify
 * @param recipeSteps steps to include in recipe
 */
const updateRows = async (recipeId: string, recipeSteps: RecipeStep[]) => {
    await deleteExcessRows(
        recipeId,
        recipeSteps.map(({ id }) => id)
    );
    if (recipeSteps.length > 0) await insertRows(recipeSteps);
};

export type StepReadByIdResponse = Omit<RecipeStep, "recipeId">;

/**
 * Get all method steps for a recipe
 * @param recipeId recipe to retrieve steps from
 * @returns RecipeStep array
 */
const selectByRecipeId = async (recipeId: string): ReadResponse<StepReadByIdResponse> =>
    db<RecipeStep>(lamington.recipeStep)
        .where({ [recipeStep.recipeId]: recipeId })
        .select(recipeStep.id, recipeStep.sectionId, recipeStep.index, recipeStep.description);

export type RecipeStepActions = typeof RecipeStepActions;

export const RecipeStepActions = {
    readByRecipeId: selectByRecipeId,
    save: updateRows,
};
