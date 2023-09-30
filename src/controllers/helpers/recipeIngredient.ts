import { RecipeIngredient, ServiceParams } from "../../database";

import { Undefined } from "../../utils";
import { RecipeService } from "../spec";

export const recipeIngredientsRequestToRows = ({
    recipeId,
    ingredients,
}: ServiceParams<RecipeService, "Save">): RecipeIngredient[] | undefined => {
    if (!ingredients?.length) return;

    return ingredients.flatMap(({ sectionId, items }) =>
        items
            .map((ingItem, index) => {
                if (!ingItem.ingredientId && !ingItem.subrecipeId) return undefined;
                return {
                    id: ingItem.id,
                    recipeId,
                    ingredientId: ingItem.ingredientId,
                    subrecipeId: ingItem.subrecipeId,
                    sectionId,
                    index,
                    description: ingItem.description,
                    unit: ingItem.unit,
                    amount: ingItem.amount,
                    multiplier: ingItem.multiplier,
                };
            })
            .filter(Undefined)
    );
};
