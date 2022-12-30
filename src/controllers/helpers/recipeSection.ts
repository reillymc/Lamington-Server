// API Specs
import { RecipeIngredients, RecipeMethod } from "../../routes/spec";

// DB Specs
import { RecipeSection } from "../../database";

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
