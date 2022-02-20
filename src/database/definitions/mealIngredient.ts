import { Table } from "./lamington";

/**
 * MealIngredient
 * 
 * Contains the mapping for each of the meal's ingredients to the Ingredient item, with additional information stored in the properties.
 */
export interface MealIngredient {
    mealId: string;
    ingredientId: string;
    section: string;
    index: number;
    description: string | undefined;
    unit: string | undefined;
    amount: number | undefined;
    multiplier: number | undefined;
}

export const mealIngredient: Table<MealIngredient> = {
    mealId: "meal_ingredient.mealId",
    ingredientId: "meal_ingredient.ingredientId",
    section: "meal_ingredient.section",
    index: "meal_ingredient.index",
    description: "meal_ingredient.description",
    unit: "meal_ingredient.unit",
    amount: "meal_ingredient.amount",
    multiplier: "meal_ingredient.multiplier",
} as const;
