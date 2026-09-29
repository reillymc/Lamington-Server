import type { components } from "../routes/spec/index.ts";
import type { PopulateAttachmentUri } from "../utils/attachmentUri.ts";
import {
    collectMealReferences,
    verifyMealReferences,
} from "./common/mealReferences.ts";
import {
    CreatedDataFetchError,
    type CreateService,
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

export const createCooklistService: CreateService<
    CooklistService,
    "cooklistRepository" | "attachmentRepository" | "recipeRepository",
    never,
    { populateAttachmentUri: PopulateAttachmentUri }
> = (
    database,
    { cooklistRepository, attachmentRepository, recipeRepository },
    { populateAttachmentUri },
) => ({
    getMeals: async (userId) => {
        const { meals } = await cooklistRepository.readAllMeals(database, {
            userId,
        });
        return meals.map((meal) => populateAttachmentUri(meal, "heroImage"));
    },
    createMeals: async (userId, meals) =>
        database.transaction(async (trx) => {
            await verifyMealReferences(
                { attachmentRepository, recipeRepository },
                trx,
                userId,
                collectMealReferences(meals, { indexed: true }),
            );

            const { meals: createdMeals } =
                await cooklistRepository.createMeals(trx, { userId, meals });

            if (createdMeals.length !== meals.length) {
                throw new CreatedDataFetchError("cooklist meal");
            }

            return createdMeals.map((meal) =>
                populateAttachmentUri(meal, "heroImage"),
            );
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

            await verifyMealReferences(
                { attachmentRepository, recipeRepository },
                trx,
                userId,
                collectMealReferences([request], { indexed: false }),
            );

            const { meals } = await cooklistRepository.updateMeals(trx, {
                userId,
                meals: [{ mealId, ...request }],
            });

            const [meal] = meals;
            if (!meal) {
                throw new UpdatedDataFetchError("cooklist meal", mealId);
            }

            return populateAttachmentUri(meal, "heroImage");
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
