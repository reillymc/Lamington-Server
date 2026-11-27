import type { IngredientCandidate } from "../../src/utils/ingredientRanking.ts";

export const createIngredientCandidate = (
    name: string,
    namePlural?: string,
    ingredientId = `${name}-id`,
): IngredientCandidate => ({
    ingredientId,
    name,
    namePlural,
});
