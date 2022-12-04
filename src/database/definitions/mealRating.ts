import { Table } from ".";

/**
 * MealRating
 *
 * Contains the mapping of each of the meal's ratings to the rater and the rating
 */

 export interface MealRating {
    mealId: string;
    raterId: string;
    rating: number;
}

export const mealRating: Table<MealRating> = {
    mealId: "meal_rating.mealId",
    raterId: "meal_rating.raterId",
    rating: "meal_rating.rating",
}
