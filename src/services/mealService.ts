import type { components } from "../routes/spec/index.ts";
import { createService, NotFoundError } from "./service.ts";

export interface MealService {
    get: (
        userId: string,
        mealId: string,
    ) => Promise<components["schemas"]["Meal"]>;
}

export const createMealService = createService<
    MealService,
    "mealRepository" | "plannerRepository"
>(({ mealRepository }) => ({
    get: async (userId, mealId) => {
        const { meals } = await mealRepository.read({
            userId,
            meals: [{ mealId }],
        });
        const [meal] = meals;

        if (!meal) {
            throw new NotFoundError("meal", mealId);
        }

        return meal;
    },
}));
