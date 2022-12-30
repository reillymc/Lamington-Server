import db, { lamington, recipeTag, tag, Tag, CreateQuery, RecipeTag } from "../database";

/**
 * Delete RecipeTags from list of recipe categories
 * @param recipeId to delete categories from
 * @param tagIds to delete
 * @returns count of rows affected/categories deleted?
 */
const deleteRecipeTags = async (recipeId: string, tagIds: string[]) => {
    const result = await db(lamington.recipeTag)
        .del()
        .whereIn(recipeTag.tagId, tagIds)
        .andWhere({ [recipeTag.recipeId]: recipeId });

    return result;
};

/**
 * Delete all RecipeTag rows for specified recipeId EXCEPT for the list of tag ids provided
 * @param recipeId recipe to run operation on
 * @param retainedCategoryIds categories to keep
 * @returns
 */
const deleteExcessRows = async (recipeId: string, retainedCategoryIds: string[]) =>
    db(lamington.recipeTag)
        .where({ [recipeTag.recipeId]: recipeId })
        .whereNotIn(recipeTag.tagId, retainedCategoryIds)
        .del();

/**
 * Create RecipeTags provided
 * @param recipeTags
 * @returns
 */
const insertRows = async (recipeTags: CreateQuery<RecipeTag>) =>
    db(lamington.recipeTag).insert(recipeTags).onConflict([recipeTag.recipeId, recipeTag.tagId]).merge();

/**
 * Update RecipeTags for recipeId, by deleting all categories not in tag list and then creating / updating provided categories in list
 * @param recipeId recipe to modify
 * @param recipeTags categories to include in recipe
 */
const updateRows = async (recipeId: string, recipeTags: RecipeTag[]) => {
    await deleteExcessRows(
        recipeId,
        recipeTags.map(({ tagId }) => tagId)
    );
    await insertRows(recipeTags);
};

type RecipeTagResults = Array<RecipeTag & Pick<Tag, "parentId" | "name">>;

/**
 * Get all categories for a recipe
 * @param recipeId recipe to retrieve categories from
 * @returns RecipeTagResults
 */
const selectRows = async (): Promise<RecipeTagResults> =>
    db(lamington.tag)
        .select(recipeTag.recipeId, recipeTag.tagId, tag.parentId, tag.name)
        .innerJoin(lamington.recipeTag, recipeTag.tagId, tag.tagId);

export type TagReadByRecipeIdResults = Array<Omit<RecipeTag, "recipeId"> & Pick<Tag, "parentId" | "name">>;

/**
 * Get all categories for a recipe
 * @param recipeId recipe to retrieve categories from
 * @returns RecipeTagResults
 */
const readByRecipeId = async (recipeId: string): Promise<TagReadByRecipeIdResults> =>
    db(lamington.tag)
        .select(recipeTag.tagId, tag.parentId, tag.name)
        .where({ [recipeTag.recipeId]: recipeId })
        .leftJoin(lamington.recipeTag, recipeTag.tagId, tag.tagId);

export const RecipeTagActions = {
    readByRecipeId,
    readAll: selectRows,
    save: updateRows,
};
