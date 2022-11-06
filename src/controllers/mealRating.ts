import db, { lamington, mealRating, MealRating, meal, CreateQuery, ReadResponse } from "../database";

/**
 * Create MealRatings provided
 * @param mealRatings
 * @returns
 */
const insertRows = async (mealRatings: CreateQuery<MealRating>) =>
    db(lamington.mealRating).insert(mealRatings).onConflict([mealRating.mealId, mealRating.raterId]).merge();

type MealRatingResult = Pick<MealRating, "rating">;

/**
 * Get average rating for a meal
 * @param mealId meal to retrieve rating from
 * @returns MealRatingsResults
 */
const selectAverageByMealId = async (mealId: string): Promise<MealRatingResult> =>
    db(lamington.mealRating)
        .select(db.raw(`ROUND(AVG(${mealRating.rating}),1) AS rating`))
        .where({ [mealRating.mealId]: mealId })
        .first();

/**
 * Get personal rating for a meal
 * @param mealId meal to retrieve rating from
 * @param userId user to retried rating from
 * @returns MealRatingsResults
 */
const selectPersonalByMealId = async (mealId: string, userId?: string): Promise<MealRatingResult> => {
    if (!userId) return { rating: 0 };
    return db(lamington.meal)
        .where({ [mealRating.mealId]: mealId, [mealRating.raterId]: userId })
        .first(mealRating.rating)
        .join(lamington.mealRating, meal.id, mealRating.mealId);
};

type MealRatingPersonalResults = Pick<MealRating, "mealId" | "rating">;

/**
 * Get personal ratings for meals
 * @param userId user to retrieve ratings from
 * @returns MealRatingsResults
 */
const selectPersonalByUserId = async (userId?: string): ReadResponse<MealRatingPersonalResults> => {
    if (!userId) return [];
    return db(lamington.mealRating)
        .where({ [mealRating.raterId]: userId })
        .select(mealRating.mealId, mealRating.rating)
        .groupBy(mealRating.mealId);
};

const MealRatingActions = {
    insertRows,
    selectPersonalByUserId,
};

export default MealRatingActions;

export { insertRows };
