// API Specs
import { RecipeIngredients } from "../../routes/spec";

// DB Specs
import { DefaultSection, RecipeIngredient } from "../../database";
import { IngredientReadByRecipeIdResponse } from "../recipeIngredient";
import { SectionsReadByRecipeIdResponse } from "../recipeSection";

import { Undefined } from "../../utils";

export const recipeIngredientRowsToResponse = (
    ingredients: Array<IngredientReadByRecipeIdResponse>,
    sections: Array<SectionsReadByRecipeIdResponse>
): RecipeIngredients => {
    const recipeIngredients: RecipeIngredients = sections
        .sort((a, b) => (a.name === DefaultSection ? -1 : a.index - b.index))
        .map(({ sectionId, name, description }) => ({
            sectionId,
            name,
            description,
            items: ingredients
                .filter(ingredient => ingredient.sectionId === sectionId)
                .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
                .map(({ recipeName, ingredientName, ...rest }) => ({ ...rest, name: ingredientName ?? recipeName })),
        }))
        .filter(({ items, name }) => (name === DefaultSection ? true : items.length));

    return recipeIngredients;
};

export const recipeIngredientsRequestToRows = (
    recipeId: string,
    ingredientSections?: RecipeIngredients
): RecipeIngredient[] | undefined => {
    if (!ingredientSections?.length) return;

    return ingredientSections.flatMap(({ sectionId, items }) =>
        items
            .map((ingItem, index) => {
                if (!ingItem.ingredientId && !ingItem.subrecipeId) return undefined;
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
