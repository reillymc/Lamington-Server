import { Table } from ".";

/**
 * MealCategory
 * 
 * Contains the mapping of each of the meal's categories
 */
export interface MealCategory {
    mealId: string;
    categoryId: string;
}

export const mealCategory: Table<MealCategory> = {
    mealId: "meal_category.mealId",
    categoryId: "meal_category.categoryId",
}