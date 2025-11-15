import type { Content } from "../../database/definitions/content.ts";
import type { Ingredient, ServiceParams } from "../../database/index.ts";

import { Undefined } from "../../utils/index.ts";
import type { RecipeService } from "../spec/index.ts";

export const ingredientsRequestToRows = ({
    createdBy,
    ingredients,
}: ServiceParams<RecipeService, "Save">):
    | Array<Partial<Ingredient & { createdBy: Content["createdBy"] }>>
    | undefined => {
    if (!ingredients?.length) return;

    return ingredients
        .flatMap(({ items }) => items)
        .map(({ ingredientId, name, ...item }): (Ingredient & { createdBy: Content["createdBy"] }) | undefined => {
            if (!ingredientId || !name) return;

            return {
                ingredientId,
                name,
                ...item,
                description: undefined,
                createdBy,
            };
        })
        .filter(Undefined);
};
