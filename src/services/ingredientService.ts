import type { components } from "../routes/spec/index.ts";
import type { CreateService } from "./service.ts";

export interface IngredientService {
    getAll: (
        userId: string,
    ) => Promise<ReadonlyArray<components["schemas"]["Ingredient"]>>;
}

export const createIngredientService: CreateService<
    IngredientService,
    "ingredientRepository"
> = (database, { ingredientRepository }) => ({
    getAll: async (userId) => {
        const { ingredients } = await ingredientRepository.readAll(database, {
            userId,
        });

        return ingredients;
    },
});
