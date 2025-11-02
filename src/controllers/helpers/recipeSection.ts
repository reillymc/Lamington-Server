import type { RecipeSection, ServiceParams } from "../../database/index.ts";
import { Undefined } from "../../utils/index.ts";
import type { RecipeService } from "../spec/index.ts";

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

    // Recipes used to be saved with the default ingredient and method sections sharing the same id.
    // Postgres does not sup[port multiple updates to the same row in one query so only one section data will be saved.
    // This should be fine as these default sections don't currently have any customisation.
    const uniqueSections = Array.from(new Set(sectionRequests.map(({ sectionId }) => sectionId)))
        .map(sectionId => sectionRequests.find(({ sectionId: id }) => id === sectionId))
        .filter(Undefined);

    if (!uniqueSections.length) return;

    return uniqueSections;
};
