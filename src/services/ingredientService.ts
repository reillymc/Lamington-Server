import type { components } from "../routes/spec/index.ts";
import type { CreateService } from "./service.ts";

export interface IngredientService {
    getAll: (
        userId: string,
    ) => Promise<ReadonlyArray<components["schemas"]["Ingredient"]>>;
    create: (
        userId: string,
        ingredients: ReadonlyArray<components["schemas"]["IngredientCreate"]>,
    ) => Promise<ReadonlyArray<components["schemas"]["Ingredient"]>>;
}

export const createIngredientService: CreateService<
    IngredientService,
    "ingredientRepository",
    "refreshIngredientsAsset"
> = (database, { ingredientRepository }, { refreshIngredientsAsset }) => ({
    getAll: async (userId) => {
        const { ingredients } = await ingredientRepository.readAll(database, {
            userId,
            filter: { owner: userId },
        });

        return ingredients;
    },
    create: async (userId, ingredients) => {
        const { ingredients: created } = await ingredientRepository.create(
            database,
            { userId, ingredients },
        );

        refreshIngredientsAsset.run();

        return created;
    },
});
