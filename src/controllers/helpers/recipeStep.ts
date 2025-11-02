import type { RecipeStep } from "../../database/index.ts";
import type { RecipeMethod } from "../spec/recipe.ts";

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
