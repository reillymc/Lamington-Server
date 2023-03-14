import { lamington, Table } from ".";

/**
 * RecipeIngredient
 *
 * Contains the mapping for each of the recipe's ingredients to the Ingredient item, with additional information stored in the properties.
 */
export interface RecipeIngredient {
    id: string;
    recipeId: string;
    sectionId: string;

    /**
     * Used when linking an ingredient item
     */
    ingredientId: string | undefined;

    /**
     * Used when linking another recipe as an ingredient
     */
    subrecipeId: string | undefined;
    index: number | undefined;
    unit: string | undefined;
    amount: number | undefined;
    multiplier: number | undefined;
    description: string | undefined;
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
