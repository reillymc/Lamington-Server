import type { components } from "../routes/spec/index.ts";
import {
    CreatedDataFetchError,
    createService,
    NotFoundError,
    UpdatedDataFetchError,
} from "./service.ts";

export interface CooklistService {
    getMeals: (
        userId: string,
    ) => Promise<ReadonlyArray<components["schemas"]["CookListMeal"]>>;
    createMeals: (
        userId: string,
        meals: ReadonlyArray<components["schemas"]["CookListMealCreate"]>,
    ) => Promise<ReadonlyArray<components["schemas"]["CookListMeal"]>>;
    updateMeal: (
        userId: string,
        mealId: string,
        meal: components["schemas"]["CookListMealUpdate"],
    ) => Promise<components["schemas"]["CookListMeal"]>;
    deleteMeal: (userId: string, mealId: string) => Promise<void>;
}

export const createCooklistService = createService<
    CooklistService,
    "cooklistRepository"
>(({ cooklistRepository }) => ({
    getMeals: async (userId) => {
        const { meals } = await cooklistRepository.readAllMeals({
            userId,
        });
        return meals;
    },
    createMeals: async (userId, meals) => {
        const { meals: createdMeals } = await cooklistRepository.createMeals({
            userId,
            meals,
        });

        if (createdMeals.length !== meals.length) {
            throw new CreatedDataFetchError("planner meal");
        }

        return createdMeals;
    },
    updateMeal: async (userId, mealId, request) => {
        const permissions = await cooklistRepository.verifyMealPermissions({
            userId,
            meals: [{ mealId }],
        });
        const missingPermissions = permissions.meals.some(
            ({ hasPermissions }) => !hasPermissions,
        );

        if (missingPermissions) {
            throw new NotFoundError("cooklist meal", mealId);
        }

        const { meals } = await cooklistRepository.updateMeals({
            meals: [{ mealId, ...request }],
        });

        const [meal] = meals;
        if (!meal) {
            throw new UpdatedDataFetchError("cooklist meal", mealId);
        }

        return meal;
    },
    deleteMeal: async (userId, mealId) => {
        const permissions = await cooklistRepository.verifyMealPermissions({
            userId,
            meals: [{ mealId }],
        });
        const missingPermissions = permissions.meals.some(
            ({ hasPermissions }) => !hasPermissions,
        );

        if (missingPermissions) {
            throw new NotFoundError("cooklist meal", mealId);
        }

        await cooklistRepository.deleteMeals({ meals: [{ mealId }] });
    },
}));
