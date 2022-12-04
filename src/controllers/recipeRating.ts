import db, { lamington, recipeRating, RecipeRating, recipe, CreateQuery, ReadResponse } from "../database";

/**
 * Create RecipeRatings provided
 * @param recipeRatings
 * @returns
 */
const insertRows = async (recipeRatings: CreateQuery<RecipeRating>) =>
    db(lamington.recipeRating).insert(recipeRatings).onConflict([recipeRating.recipeId, recipeRating.raterId]).merge();

type RecipeRatingResult = Pick<RecipeRating, "rating">;

/**
 * Get average rating for a recipe
 * @param recipeId recipe to retrieve rating from
 * @returns RecipeRatingsResults
 */
const selectAverageByRecipeId = async (recipeId: string): Promise<RecipeRatingResult> =>
    db(lamington.recipeRating)
        .select(db.raw(`ROUND(AVG(${recipeRating.rating}),1) AS rating`))
        .where({ [recipeRating.recipeId]: recipeId })
        .first();

/**
 * Get personal rating for a recipe
 * @param recipeId recipe to retrieve rating from
 * @param userId user to retried rating from
 * @returns RecipeRatingsResults
 */
const selectPersonalByRecipeId = async (recipeId: string, userId?: string): Promise<RecipeRatingResult> => {
    if (!userId) return { rating: 0 };
    return db(lamington.recipe)
        .where({ [recipeRating.recipeId]: recipeId, [recipeRating.raterId]: userId })
        .first(recipeRating.rating)
        .join(lamington.recipeRating, recipe.recipeId, recipeRating.recipeId);
};

type RecipeRatingPersonalResults = Pick<RecipeRating, "recipeId" | "rating">;

/**
 * Get personal ratings for recipes
 * @param userId user to retrieve ratings from
 * @returns RecipeRatingsResults
 */
const selectPersonalByUserId = async (userId?: string): ReadResponse<RecipeRatingPersonalResults> => {
    if (!userId) return [];
    return db(lamington.recipeRating)
        .where({ [recipeRating.raterId]: userId })
        .select(recipeRating.recipeId, recipeRating.rating)
        .groupBy(recipeRating.recipeId);
};

const RecipeRatingActions = {
    insertRows,
    selectPersonalByUserId,
};

export default RecipeRatingActions;

export { insertRows };
