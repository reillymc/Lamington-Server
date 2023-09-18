import { RecipeSection, ServiceParams } from "../../database";
import { RecipeService } from "../spec";

export const recipeSectionRequestToRows = ({
    recipeId,
    ingredients = [],
    method = [],
}: ServiceParams<RecipeService, "Save">): Array<RecipeSection> | undefined => {
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
