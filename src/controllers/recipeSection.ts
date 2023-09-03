import db, { lamington, QueryService, Recipe, recipeSection, RecipeSection, SaveService } from "../database";
import { EnsureArray } from "../utils";

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
const updateRows: SaveService<
    Pick<Recipe, "recipeId"> & { sections: Array<Omit<RecipeSection, "recipeId">> }
> = async params => {
    const recipeSections = EnsureArray(params);

    for (const { recipeId, sections } of recipeSections) {
        await deleteExcessRows(
            recipeId,
            sections.map(({ sectionId }) => sectionId)
        );
    }

    const sections = recipeSections.flatMap(({ recipeId, sections }) =>
        sections.map((section): RecipeSection => ({ ...section, recipeId }))
    );

    if (sections.length > 0) await insertRows(sections);

    return [];
};

/**
 * Get all method steps for a recipe
 * @param recipeId recipe to retrieve steps from
 * @returns RecipeSection array
 */
const queryByRecipeId: QueryService<RecipeSection, Pick<Recipe, "recipeId">> = async ({ recipeId }) => {
    const result = await db(lamington.recipeSection)
        .where({ [recipeSection.recipeId]: recipeId })
        .select(
            recipeSection.recipeId,
            recipeSection.sectionId,
            recipeSection.index,
            recipeSection.name,
            recipeSection.description
        );

    return { result };
};

export type RecipeSectionActions = typeof RecipeSectionActions;

export const RecipeSectionActions = {
    queryByRecipeId,
    save: updateRows,
};
