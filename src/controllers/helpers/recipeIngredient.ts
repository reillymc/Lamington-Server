// API Specs
import { RecipeIngredients } from "../../routes/spec";

// DB Specs
import { RecipeIngredient } from "../../database";
import { IngredientReadByRecipeIdResponse } from "../recipeIngredient";
import { SectionsReadByRecipeIdResponse } from "../recipeSection";

import { Undefined } from "../../utils";

export const recipeIngredientRowsToResponse = (
    ingredients: Array<IngredientReadByRecipeIdResponse>,
    sections: Array<SectionsReadByRecipeIdResponse>
): RecipeIngredients => {
    const recipeIngredients: RecipeIngredients = sections
        .sort((a, b) => a.index - b.index)
        .map(({ sectionId, name, description }) => ({
            sectionId,
            name,
            description,
            items: ingredients.filter(ingredient => ingredient.sectionId === sectionId),
        }));

    return recipeIngredients.filter(({ items }) => items.length);
};

export const recipeIngredientsRequestToRows = (
    recipeId: string,
    ingredientSections?: RecipeIngredients
): RecipeIngredient[] | undefined => {
    if (!ingredientSections?.length) return;

    return ingredientSections.flatMap(({ sectionId, items }) =>
        items
            .map((ingItem, index) => {
                if (!ingItem.ingredientId) return undefined;
                return {
                    id: ingItem.id,
                    recipeId,
                    ingredientId: ingItem.ingredientId,
                    subrecipeId: ingItem.subrecipeId,
                    sectionId,
                    index,
                    description: ingItem.description,
                    unit: ingItem.unit,
                    amount: ingItem.amount,
                    multiplier: ingItem.multiplier,
                };
            })
            .filter(Undefined)
    );
};
