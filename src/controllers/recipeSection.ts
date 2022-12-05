import db, { lamington, ReadResponse, recipeSection, RecipeSection } from "../database";

/**
 * Delete all RecipeSection rows for specified recipeId EXCEPT for the list of section ids provided
 * @param recipeId recipe to run operation on
 * @param retainedSectionIds sections to keep
 * @returns
 */
const deleteExcessRows = async (recipeId: string, retainedSectionIds: string[]) =>
    db(lamington.recipeSection)
        .where({ [recipeSection.recipeId]: recipeId })
        .whereNotIn(recipeSection.sectionId, retainedSectionIds)
        .del();

/**
 * Create RecipeSections provided
 * @param recipeSections
 * @returns
 */
const insertRows = async (recipeSections: RecipeSection[]) =>
    db(lamington.recipeSection)
        .insert(recipeSections)
        .onConflict([recipeSection.recipeId, recipeSection.sectionId])
        .merge();

/**
 * Update RecipeSections for recipeId, by deleting all steps not in step list and then creating / updating provided steps in list
 * @param recipeId recipe to modify
 * @param recipeSections steps to include in recipe
 */
const updateRows = async (recipeId: string, recipeSections: RecipeSection[]) => {
    await deleteExcessRows(
        recipeId,
        recipeSections.map(({ sectionId }) => sectionId)
    );
    await insertRows(recipeSections);
};

export type SectionsReadByRecipeIdResponse = Omit<RecipeSection, "recipeId">;

/**
 * Get all method steps for a recipe
 * @param recipeId recipe to retrieve steps from
 * @returns RecipeSection array
 */
const selectByRecipeId = async (recipeId: string): ReadResponse<SectionsReadByRecipeIdResponse> =>
    db(lamington.recipeSection)
        .where({ [recipeSection.recipeId]: recipeId })
        .select(recipeSection.sectionId, recipeSection.index, recipeSection.name, recipeSection.description);

export const RecipeSectionActions = {
    readByRecipeId: selectByRecipeId,
    save: updateRows,
};
