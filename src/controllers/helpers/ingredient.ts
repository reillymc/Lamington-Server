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
        .map(({ ingredientId, name, ...item }): Ingredient | undefined => {
            if (!ingredientId || !name) return;

            return {
                ingredientId,
                name,
                ...item,
                photo: undefined,
                description: undefined,
                createdBy,
            };
        })
        .filter(Undefined);
};
