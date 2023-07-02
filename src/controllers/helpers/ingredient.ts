// API Specs
import { RecipeIngredients } from "../../routes/spec";

// DB Specs
import { Ingredient } from "../../database";

import { Undefined } from "../../utils";

export const ingredientsRequestToRows = ({
    createdBy,
    ingredients,
}: {
    ingredients?: RecipeIngredients;
    createdBy?: string;
}): Array<Partial<Ingredient>> | undefined => {
    if (!ingredients?.length) return;

    return ingredients
        .flatMap(({ items }) => items)
        .map(item => ({
            ...item,
            createdBy,
        }))
        .filter(Undefined);
};
