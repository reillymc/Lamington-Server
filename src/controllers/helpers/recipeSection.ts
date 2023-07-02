// API Specs
import { RecipeIngredients, RecipeMethod } from "../../routes/spec";

// DB Specs
import { RecipeSection } from "../../database";

export const recipeSectionRequestToRows = ({
    recipeId,
    ingredients = [],
    method = [],
}: {
    recipeId: string;
    ingredients?: RecipeIngredients;
    method?: RecipeMethod;
}): Array<RecipeSection> | undefined => {
    const ingSectionRequests: Array<RecipeSection> = ingredients.map(({ sectionId, name, description }, index) => ({
        sectionId,
        recipeId,
        name,
        description,
        index,
    }));
    const methodSectionRequests: Array<RecipeSection> = method.map(({ sectionId, name, description }, index) => ({
        sectionId,
        recipeId,
        name,
        description,
        index,
    }));

    const sectionRequests = [...ingSectionRequests, ...methodSectionRequests];

    if (!sectionRequests.length) return;

    return sectionRequests;
};
