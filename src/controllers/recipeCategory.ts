import db, { lamington, recipeCategory, category, Category, CreateQuery, RecipeCategory } from "../database";

/**
 * Delete RecipeCategories from list of recipe categories
 * @param recipeId to delete categories from
 * @param categoryIds to delete
 * @returns count of rows affected/categories deleted?
 */
const deleteRecipeCategories = async (recipeId: string, categoryIds: string[]) => {
    const result = await db(lamington.recipeCategory)
        .del()
        .whereIn(recipeCategory.categoryId, categoryIds)
        .andWhere({ [recipeCategory.recipeId]: recipeId });

    return result;
};

/**
 * Delete all RecipeCategory rows for specified recipeId EXCEPT for the list of category ids provided
 * @param recipeId recipe to run operation on
 * @param retainedCategoryIds categories to keep
 * @returns
 */
const deleteExcessRows = async (recipeId: string, retainedCategoryIds: string[]) =>
    db(lamington.recipeCategory)
        .where({ [recipeCategory.recipeId]: recipeId })
        .whereNotIn(recipeCategory.categoryId, retainedCategoryIds)
        .del();

/**
 * Create RecipeCategories provided
 * @param recipeCategories
 * @returns
 */
const insertRows = async (recipeCategories: CreateQuery<RecipeCategory>) =>
    db(lamington.recipeCategory)
        .insert(recipeCategories)
        .onConflict([recipeCategory.recipeId, recipeCategory.categoryId])
        .merge();

/**
 * Update RecipeCategories for recipeId, by deleting all categories not in category list and then creating / updating provided categories in list
 * @param recipeId recipe to modify
 * @param recipeCategories categories to include in recipe
 */
const updateRows = async (recipeId: string, recipeCategories: RecipeCategory[]) => {
    await deleteExcessRows(
        recipeId,
        recipeCategories.map(({ categoryId }) => categoryId)
    );
    await insertRows(recipeCategories);
};

type RecipeCategoryResults = Array<RecipeCategory & Pick<Category, "type" | "name">>;

/**
 * Get all categories for a recipe
 * @param recipeId recipe to retrieve categories from
 * @returns RecipeCategoryResults
 */
const selectRows = async (): Promise<RecipeCategoryResults> =>
    db(lamington.category)
        .select(recipeCategory.recipeId, recipeCategory.categoryId, category.type, category.name)
        .innerJoin(lamington.recipeCategory, recipeCategory.categoryId, category.categoryId);

type RecipeCategoryByRecipeIdResults = Array<Omit<RecipeCategory, "recipeId"> & Pick<Category, "type" | "name">>;

/**
 * Get all categories for a recipe
 * @param recipeId recipe to retrieve categories from
 * @returns RecipeCategoryResults
 */
const selectByRecipeId = async (recipeId: string): Promise<RecipeCategoryByRecipeIdResults> =>
    db(lamington.category)
        .select(recipeCategory.categoryId, category.type, category.name)
        .where({ [recipeCategory.recipeId]: recipeId })
        .leftJoin(lamington.recipeCategory, recipeCategory.categoryId, category.categoryId);

const RecipeCategoryActions = {
    selectByRecipeId,
    selectRows,
    updateRows,
};

export default RecipeCategoryActions;

export { deleteExcessRows, insertRows, selectRows, selectByRecipeId, updateRows, RecipeCategoryByRecipeIdResults };
