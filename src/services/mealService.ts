import type { components } from "../routes/spec/index.ts";
import { NotFoundError } from "./logging.ts";
import { type CreateService } from "./service.ts";

export interface MealService {
    get: (userId: string, mealId: string) => Promise<components["schemas"]["Meal"]>;
}

export const createMealService: CreateService<MealService, "mealRepository" | "plannerRepository"> = (
    database,
    { mealRepository }
) => ({
    get: async (userId, mealId) => {
        const { meals } = await mealRepository.read(database, { userId, meals: [{ mealId }] });
        const [meal] = meals;

        if (!meal) {
            throw new NotFoundError("meal", mealId);
        }

        return meal;
    },
});
