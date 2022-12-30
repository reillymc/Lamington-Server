// API Specs
import { RecipeMethod } from "../../routes/spec";

// DB Specs
import { RecipeStep } from "../../database";
import { SectionsReadByRecipeIdResponse } from "../recipeSection";
import { StepReadByIdResponse } from "../recipeStep";

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
