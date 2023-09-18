import { Ingredient, ServiceParams } from "../../database";

import { Undefined } from "../../utils";
import { RecipeService } from "../spec";

export const ingredientsRequestToRows = ({
    createdBy,
    ingredients,
}: ServiceParams<RecipeService, "Save">): Array<Partial<Ingredient>> | undefined => {
    if (!ingredients?.length) return;

    return ingredients
        .flatMap(({ items }) => items)
        .map(
            (item): Partial<Ingredient> => ({
                ingredientId: item.ingredientId,
                name: item.name,
                createdBy,
            })
        )
        .filter(Undefined);
};
