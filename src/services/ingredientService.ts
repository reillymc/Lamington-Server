import type { components } from "../routes/spec/index.ts";
import { createService } from "./service.ts";

export interface IngredientService {
    getAll: (
        userId: string,
    ) => Promise<ReadonlyArray<components["schemas"]["Ingredient"]>>;
    create: (
        userId: string,
        ingredients: ReadonlyArray<components["schemas"]["IngredientCreate"]>,
    ) => Promise<ReadonlyArray<components["schemas"]["Ingredient"]>>;
}

export const createIngredientService = createService<
    IngredientService,
    "ingredientRepository",
    "refreshIngredientsAsset"
>(({ ingredientRepository }, { refreshIngredientsAsset }) => ({
    getAll: async (userId) => {
        const { ingredients } = await ingredientRepository.readAll({
            userId,
        });

        return ingredients;
    },
    create: async (userId, ingredients) => {
        const { ingredients: created } = await ingredientRepository.create({
            userId,
            ingredients,
        });

        refreshIngredientsAsset.run();

        return created;
    },
}));
