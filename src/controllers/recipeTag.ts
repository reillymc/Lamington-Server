import db, { lamington, recipeTag, tag, Tag, CreateQuery, RecipeTag, SaveService, Recipe } from "../database";
import { EnsureArray } from "../utils";

/**
 * Delete RecipeTags from list of recipe tags
 * @param recipeId to delete tags from
 * @param tagIds to delete
 * @returns count of rows affected/tags deleted?
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
 * @param retainedCategoryIds tags to keep
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
 * Update RecipeTags for recipeId, by deleting all tags not in tag list and then creating / updating provided tags in list
 * @param recipeId recipe to modify
 * @param recipeTags tags to include in recipe
 */
const updateRows: SaveService<Pick<Recipe, "recipeId"> & { tags: Array<Pick<RecipeTag, "tagId">> }> = async params => {
    const recipeTags = EnsureArray(params);

    for (const recipeTagList of recipeTags) {
        await deleteExcessRows(
            recipeTagList.recipeId,
            recipeTagList.tags.map(({ tagId }) => tagId)
        );
    }

    const tags = recipeTags.flatMap(({ recipeId, tags }) => tags.map(({ tagId }) => ({ recipeId, tagId })));

    if (tags.length) await insertRows(tags);

    return [];
};

export type TagReadByRecipeIdResults = Array<RecipeTag & Pick<Tag, "parentId" | "name">>;

/**
 * Get all tags for a recipe
 * @param recipeId recipe to retrieve tags from
 * @returns RecipeTagResults
 */
const readByRecipeId = async (recipeIds: string | string[]): Promise<TagReadByRecipeIdResults> => {
    const recipeIdList = Array.isArray(recipeIds) ? recipeIds : [recipeIds];

    return db(lamington.tag)
        .select(recipeTag.tagId, tag.parentId, tag.name, recipeTag.recipeId)
        .whereIn(recipeTag.recipeId, recipeIdList)
        .leftJoin(lamington.recipeTag, recipeTag.tagId, tag.tagId)
        .union(qb =>
            qb
                .select(tag.tagId, tag.parentId, tag.name, recipeTag.recipeId)
                .leftJoin(lamington.recipeTag, recipeTag.tagId, tag.tagId)
                .from(lamington.tag)
                .whereIn(
                    tag.tagId,
                    db
                        .select(tag.parentId)
                        .from(lamington.tag)
                        .whereIn(recipeTag.recipeId, recipeIdList)
                        .leftJoin(lamington.recipeTag, recipeTag.tagId, tag.tagId)
                )
        );
};

export type RecipeTagActions = typeof RecipeTagActions;

export const RecipeTagActions = {
    readByRecipeId,
    save: updateRows,
};
