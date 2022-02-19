import { Table } from "./lamington";

/**
 * MealIngredient
 * Contains the mapping for each of the meal's ingredients to the Ingredient item, with additional information stored in the properties.
 */
export interface MealIngredientProperties {
    index: number;
    section?: string;
    amount?: number;
    notes?: string;
    unit?: string;
    multiplier?: number;
}

export interface MealIngredient {
    id: string;
    mealId: string;
    ingredientId: string;
    properties: string | undefined; // Stringified MealIngredientProperties
}

export const mealIngredient: Table<MealIngredient> = {
    id: "meal_ingredient.id",
    mealId: "meal_ingredient.mealId",
    ingredientId: "meal_ingredient.ingredientId",
    properties: "meal_ingredient.properties",
} as const;
