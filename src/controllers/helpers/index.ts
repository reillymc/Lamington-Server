import { v4 as Uuid } from "uuid";

import { Undefined } from "../../utils";
import { RecipeCategory, RecipeIngredient, RecipeStep } from "../../database";

// DB Actions
import { CategoryReadByRecipeIdResults } from "../recipeCategory";
import { IngredientReadByRecipeIdResponse } from "../recipeIngredient";
import { SectionsReadByRecipeIdResponse } from "../recipeSection";
import { StepReadByIdResponse } from "../recipeStep";

// Server Response Specs
import { RecipeCategories, RecipeIngredients, RecipeMethod } from "../../routes/spec";
import { IngredientSaveRequest } from "..";

export const ingredientsRequestToRows = (
    ingredientSections?: RecipeIngredients
): Array<IngredientSaveRequest> | undefined => {
    if (!ingredientSections?.length) return;

    return ingredientSections
        .flatMap(({ items }) => items)
        .filter(({ name }) => name !== undefined)
        .map(({ ingredientId, name }) => ({ id: ingredientId, name }));
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

export const recipeMethodRequestToRows = (
    recipeId: string,
    methodSections?: RecipeMethod
): RecipeStep[] | undefined => {
    if (!methodSections?.length) return;

    return methodSections.flatMap(({ sectionId, items }) =>
        items.map(
            (step, index): RecipeStep => ({
                id: step.id,
                recipeId,
                stepId: step.stepId ?? Uuid(),
                sectionId,
                index,
                description: step.description,
                photo: undefined,
            })
        )
    );
};

export const recipeCategoriesRequestToRows = (recipeId: string, categories: RecipeCategories = []): RecipeCategory[] =>
    categories.map(({ categoryId }) => ({
        recipeId,
        categoryId,
    }));

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

    return recipeIngredients;
};

export const recipeStepRowsToResponse = (
    method: Array<StepReadByIdResponse>,
    sections: Array<SectionsReadByRecipeIdResponse>
): RecipeMethod => {
    const recipeMethod: RecipeMethod = sections
        .sort((a, b) => a.index - b.index)
        .map(({ sectionId, name, description }) => ({
            sectionId,
            name,
            description,
            items: method.filter(method => method.sectionId === sectionId),
        }));

    return recipeMethod;
};

export const recipeCategoryRowsToResponse = (categories: CategoryReadByRecipeIdResults): RecipeCategories => {
    const responseData: RecipeCategories = categories.map(catItem => ({
        categoryId: catItem.categoryId,
        name: catItem.name,
        type: catItem.type,
    }));
    return responseData;
};
