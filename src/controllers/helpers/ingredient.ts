// API Specs
import { RecipeIngredients } from "../../routes/spec";

// DB Specs
import { Ingredient } from "../../database";

import { Undefined } from "../../utils";

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
