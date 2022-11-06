import { lamington, mealStep } from "..";
import db from "../config";
import { MealStep } from "../definitions";

/**
 * Delete all MealStep rows for specified mealId EXCEPT for the list of step ids provided
 * @param mealId meal to run operation on
 * @param retainedStepIds steps to keep
 * @returns
 */
const deleteExcessRows = async (mealId: string, retainedStepIds: string[]) =>
    db(lamington.mealStep)
        .where({ [mealStep.mealId]: mealId })
        .whereNotIn(mealStep.stepId, retainedStepIds)
        .del();

/**
 * Create MealSteps provided
 * @param mealSteps
 * @returns
 */
const insertRows = async (mealSteps: MealStep[]) =>
    db(lamington.mealStep)
        .insert(mealSteps)
        .onConflict([mealStep.mealId, mealStep.stepId])
        .merge();

/**
 * Update MealSteps for mealId, by deleting all steps not in step list and then creating / updating provided steps in list
 * @param mealId meal to modify
 * @param mealSteps steps to include in meal
 */
const updateRows = async (mealId: string, mealSteps: MealStep[]) => {
    await deleteExcessRows(
        mealId,
        mealSteps.map(({ stepId }) => stepId)
    );
    await insertRows(mealSteps);
};

type MealStepResults = Array<Omit<MealStep, "mealId">>

/**
 * Get all method steps for a meal
 * @param mealId meal to retrieve steps from
 * @returns MealStep array
 */
const selectByMealId = async (mealId: string): Promise<MealStepResults> =>
    db(lamington.mealStep)
        .where({ [mealStep.mealId]: mealId })
        .select(
            mealStep.stepId,
            mealStep.sectionId,
            mealStep.index,
            mealStep.description
            );

const MealStepActions = {
    selectByMealId,
    updateRows,
};

export default MealStepActions;

export { deleteExcessRows, insertRows, selectByMealId, updateRows, MealStepResults };
