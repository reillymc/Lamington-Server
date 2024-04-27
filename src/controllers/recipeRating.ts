import db, { CreateQuery, ReadResponse, RecipeRating, lamington } from "../database";

/**
 * Create RecipeRatings provided
 * @param recipeRatings
 * @returns
 */
const insertRows = async (recipeRatings: CreateQuery<RecipeRating>) =>
    db<RecipeRating>(lamington.recipeRating).insert(recipeRatings).onConflict(["recipeId", "raterId"]).merge();

type RecipeRatingPersonalResults = Pick<RecipeRating, "recipeId" | "rating">;

/**
 * Get personal ratings for recipes
 * @param userId user to retrieve ratings from
 * @returns RecipeRatingsResults
 */
const selectPersonalByUserId = async (userId?: string): ReadResponse<RecipeRatingPersonalResults> => {
    if (!userId) return [];
    return db<RecipeRating>(lamington.recipeRating)
        .where({ raterId: userId })
        .select("recipeId", "rating")
        .groupBy("rating");
};

export const RecipeRatingActions = {
    save: insertRows,
    readMy: selectPersonalByUserId,
};
