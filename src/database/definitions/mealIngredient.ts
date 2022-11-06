import { Table } from "./lamington";

/**
 * MealIngredient
 *
 * Contains the mapping for each of the meal's ingredients to the Ingredient item, with additional information stored in the properties.
 */
export interface MealIngredient {
    id: string;
    mealId: string;
    sectionId: string;

    /**
     * Used when linking an ingredient item
     */
    ingredientId: string | undefined;

    /**
     * Used when linking another recipe as an ingredient
     */
    recipeId: string | undefined;
    index: number | undefined;
    description: string | undefined;
    unit: string | undefined;
    amount: number | undefined;
    multiplier: number | undefined;
}

export const mealIngredient: Table<MealIngredient> = {
    id: "meal_ingredient.id",
    mealId: "meal_ingredient.mealId",
    sectionId: "meal_ingredient.sectionId",
    ingredientId: "meal_ingredient.ingredientId",
    recipeId: "meal_ingredient.recipeId",
    index: "meal_ingredient.index",
    description: "meal_ingredient.description",
    unit: "meal_ingredient.unit",
    amount: "meal_ingredient.amount",
    multiplier: "meal_ingredient.multiplier",
} as const;
