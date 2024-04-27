import { Table } from ".";
import { RecipeIngredientAmount } from "../../routes/spec";
import { lamington } from "./lamington";

/**
 * RecipeIngredient
 *
 * Contains the mapping for each of the recipe's ingredients to the Ingredient item, with additional
 * information stored in the properties.
 */
export interface RecipeIngredient {
    id: string;
    recipeId: string;
    sectionId: string;

    /**
     * Used when linking an ingredient item
     */
    ingredientId?: string;

    /**
     * Used when linking another recipe as an ingredient
     */
    subrecipeId?: string;
    index?: number;
    unit?: string;

    /**
     * JSON stringified object containing the amount of the ingredient, as type number, fraction
     * or range with its representation explicitly denoted.
     * TODO: Define this type correctly like other new json types
     */
    amount?: RecipeIngredientAmount;
    multiplier?: number;
    description?: string;
}

export const recipeIngredient: Table<RecipeIngredient> = {
    id: `${lamington.recipeIngredient}.id`,
    recipeId: `${lamington.recipeIngredient}.recipeId`,
    sectionId: `${lamington.recipeIngredient}.sectionId`,
    ingredientId: `${lamington.recipeIngredient}.ingredientId`,
    subrecipeId: `${lamington.recipeIngredient}.subrecipeId`,
    index: `${lamington.recipeIngredient}.index`,
    unit: `${lamington.recipeIngredient}.unit`,
    amount: `${lamington.recipeIngredient}.amount`,
    multiplier: `${lamington.recipeIngredient}.multiplier`,
    description: `${lamington.recipeIngredient}.description`,
} as const;
