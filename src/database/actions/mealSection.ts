import { lamington, mealSection } from "..";
import db from "../config";
import { MealSection } from "../definitions";

/**
 * Delete all MealSection rows for specified mealId EXCEPT for the list of section ids provided
 * @param mealId meal to run operation on
 * @param retainedSectionIds sections to keep
 * @returns
 */
const deleteExcessRows = async (mealId: string, retainedSectionIds: string[]) =>
    db(lamington.mealSection)
        .where({ [mealSection.mealId]: mealId })
        .whereNotIn(mealSection.sectionId, retainedSectionIds)
        .del();

/**
 * Create MealSections provided
 * @param mealSections
 * @returns
 */
const insertRows = async (mealSections: MealSection[]) =>
    db(lamington.mealSection).insert(mealSections).onConflict([mealSection.mealId, mealSection.sectionId]).merge();

/**
 * Update MealSections for mealId, by deleting all steps not in step list and then creating / updating provided steps in list
 * @param mealId meal to modify
 * @param mealSections steps to include in meal
 */
const updateRows = async (mealId: string, mealSections: MealSection[]) => {
    await deleteExcessRows(
        mealId,
        mealSections.map(({ sectionId }) => sectionId)
    );
    await insertRows(mealSections);
};

type MealSectionResults = Array<Omit<MealSection, "mealId">>;

/**
 * Get all method steps for a meal
 * @param mealId meal to retrieve steps from
 * @returns MealSection array
 */
const selectByMealId = async (mealId: string): Promise<MealSectionResults> =>
    db(lamington.mealSection)
        .where({ [mealSection.mealId]: mealId })
        .select(mealSection.sectionId, mealSection.index, mealSection.name, mealSection.description);

const MealSectionActions = {
    selectByMealId,
    updateRows,
};

export default MealSectionActions;

export { deleteExcessRows, insertRows, selectByMealId, updateRows, MealSectionResults };
