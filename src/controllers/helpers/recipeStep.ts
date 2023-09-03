// API Specs
import { RecipeMethod } from "../../routes/spec";

// DB Specs
import { DefaultSection, RecipeSection, RecipeStep } from "../../database";
import { StepReadByIdResponse } from "../recipeStep";

export const recipeStepRowsToResponse = (
    method: Array<StepReadByIdResponse>,
    sections: Array<RecipeSection>
): RecipeMethod => {
    const recipeMethod: RecipeMethod = sections
        .sort((a, b) => (a.name === DefaultSection ? -1 : a.index - b.index))
        .map(({ sectionId, name, description }) => ({
            sectionId,
            name,
            description,
            items: method
                .filter(method => method.sectionId === sectionId)
                .sort((a, b) => (a.index ?? 0) - (b.index ?? 0)),
        }))
        .filter(({ items, name }) => (name === DefaultSection ? true : items.length));

    return recipeMethod;
};

export const recipeMethodRequestToRows = ({
    recipeId,
    method,
}: {
    recipeId: string;
    method?: RecipeMethod;
}): RecipeStep[] | undefined => {
    if (!method?.length) return;

    return method.flatMap(({ sectionId, items }) =>
        items.map(
            ({ id, description, photo }, index): RecipeStep => ({ id, recipeId, sectionId, index, description, photo })
        )
    );
};
