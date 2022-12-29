import { Undefined } from "../../utils";
import { Ingredient, RecipeCategory, RecipeIngredient, RecipeSection, RecipeStep } from "../../database";

// DB Actions
import { CategoryReadByRecipeIdResults } from "../recipeCategory";
import { IngredientReadByRecipeIdResponse } from "../recipeIngredient";
import { SectionsReadByRecipeIdResponse } from "../recipeSection";
import { StepReadByIdResponse } from "../recipeStep";

// Server Response Specs
import { RecipeCategories, RecipeIngredients, RecipeMethod } from "../../routes/spec";

export const recipeSectionRequestToRows = (
    recipeId: string,
    ingredientSections: RecipeIngredients = [],
    methodSections: RecipeMethod = []
): Array<RecipeSection> | undefined => {
    const ingSectionRequests: Array<RecipeSection> = ingredientSections.map(
        ({ sectionId, name, description }, index) => ({
            sectionId,
            recipeId,
            name,
            description,
            index,
        })
    );
    const methodSectionRequests: Array<RecipeSection> = methodSections.map(
        ({ sectionId, name, description }, index) => ({
            sectionId,
            recipeId,
            name,
            description,
            index,
        })
    );

    const sectionRequests = [...ingSectionRequests, ...methodSectionRequests];

    if (!sectionRequests.length) return;

    return sectionRequests;
};

export const ingredientsRequestToRows = (
    ingredientSections?: RecipeIngredients,
    createdBy?: string
): Array<Partial<Ingredient>> | undefined => {
    if (!ingredientSections?.length) return;

    return ingredientSections
        .flatMap(({ items }) => items)
        .map(item => ({
            ...item,
            createdBy,
        }))
        .filter(Undefined);
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
            ({ id, description, photo }, index): RecipeStep => ({ id, recipeId, sectionId, index, description, photo })
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
