import { RecipeStep } from "../../database";
import { RecipeMethod } from "../spec/recipe";

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
