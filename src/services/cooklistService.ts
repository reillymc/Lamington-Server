import type { components } from "../routes/spec/index.ts";
import {
    CreatedDataFetchError,
    NotFoundError,
    UpdatedDataFetchError,
} from "./logging.ts";
import type { CreateService } from "./service.ts";

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

export const createCooklistService: CreateService<
    CooklistService,
    "cooklistRepository"
> = (database, { cooklistRepository }) => ({
    getMeals: async (userId) => {
        const { meals } = await cooklistRepository.readAllMeals(database, {
            userId,
        });
        return meals;
    },
    createMeals: async (userId, meals) =>
        database.transaction(async (trx) => {
            const { meals: createdMeals } =
                await cooklistRepository.createMeals(trx, { userId, meals });

            if (createdMeals.length !== meals.length) {
                throw new CreatedDataFetchError("planner meal");
            }

            return createdMeals;
        }),
    updateMeal: (userId, mealId, request) =>
        database.transaction(async (trx) => {
            const permissions = await cooklistRepository.verifyMealPermissions(
                trx,
                { userId, meals: [{ mealId }] },
            );
            const missingPermissions = permissions.meals.some(
                ({ hasPermissions }) => !hasPermissions,
            );

            if (missingPermissions) {
                throw new NotFoundError("cooklist meal", mealId);
            }

            const { meals } = await cooklistRepository.updateMeals(trx, {
                meals: [{ mealId, ...request }],
            });

            const [meal] = meals;
            if (!meal) {
                throw new UpdatedDataFetchError("cooklist meal", mealId);
            }

            return meal;
        }),
    deleteMeal: (userId, mealId) =>
        database.transaction(async (trx) => {
            const permissions = await cooklistRepository.verifyMealPermissions(
                trx,
                { userId, meals: [{ mealId }] },
            );
            const missingPermissions = permissions.meals.some(
                ({ hasPermissions }) => !hasPermissions,
            );

            if (missingPermissions) {
                throw new NotFoundError("cooklist meal", mealId);
            }

            await cooklistRepository.deleteMeals(trx, { meals: [{ mealId }] });
        }),
});
