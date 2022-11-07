import db, { lamington, mealCategory, category, Category, CreateQuery, MealCategory } from "../database";

/**
 * Delete MealCategories from list of meal categories
 * @param mealId to delete categories from
 * @param categoryIds to delete
 * @returns count of rows affected/categories deleted?
 */
const deleteMealCategories = async (mealId: string, categoryIds: string[]) => {
    const result = await db(lamington.mealCategory)
        .del()
        .whereIn(mealCategory.categoryId, categoryIds)
        .andWhere({ [mealCategory.mealId]: mealId });

    return result;
};

/**
 * Delete all MealCategory rows for specified mealId EXCEPT for the list of category ids provided
 * @param mealId meal to run operation on
 * @param retainedCategoryIds categories to keep
 * @returns
 */
const deleteExcessRows = async (mealId: string, retainedCategoryIds: string[]) =>
    db(lamington.mealCategory)
        .where({ [mealCategory.mealId]: mealId })
        .whereNotIn(mealCategory.categoryId, retainedCategoryIds)
        .del();

/**
 * Create MealCategories provided
 * @param mealCategories
 * @returns
 */
const insertRows = async (mealCategories: CreateQuery<MealCategory>) =>
    db(lamington.mealCategory)
        .insert(mealCategories)
        .onConflict([mealCategory.mealId, mealCategory.categoryId])
        .merge();

/**
 * Update MealCategories for mealId, by deleting all categories not in category list and then creating / updating provided categories in list
 * @param mealId meal to modify
 * @param mealCategories categories to include in meal
 */
const updateRows = async (mealId: string, mealCategories: MealCategory[]) => {
    await deleteExcessRows(
        mealId,
        mealCategories.map(({ categoryId }) => categoryId)
    );
    await insertRows(mealCategories);
};

type MealCategoryResults = Array<MealCategory & Pick<Category, "type" | "name">>;

/**
 * Get all categories for a meal
 * @param mealId meal to retrieve categories from
 * @returns MealCategoryResults
 */
const selectRows = async (): Promise<MealCategoryResults> =>
    db(lamington.category)
        .select(mealCategory.mealId, mealCategory.categoryId, category.type, category.name)
        .innerJoin(lamington.mealCategory, mealCategory.categoryId, category.categoryId);

type MealCategoryByMealIdResults = Array<Omit<MealCategory, "mealId"> & Pick<Category, "type" | "name">>;

/**
 * Get all categories for a meal
 * @param mealId meal to retrieve categories from
 * @returns MealCategoryResults
 */
const selectByMealId = async (mealId: string): Promise<MealCategoryByMealIdResults> =>
    db(lamington.category)
        .select(mealCategory.categoryId, category.type, category.name)
        .where({ [mealCategory.mealId]: mealId })
        .leftJoin(lamington.mealCategory, mealCategory.categoryId, category.categoryId);

const MealCategoryActions = {
    selectByMealId,
    selectRows,
    updateRows,
};

export default MealCategoryActions;

export { deleteExcessRows, insertRows, selectRows, selectByMealId, updateRows, MealCategoryByMealIdResults };
