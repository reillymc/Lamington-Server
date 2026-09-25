import type { components } from "../routes/spec/index.ts";
import type { PopulateAttachmentUri } from "../utils/attachmentUri.ts";
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
            const { attachments } =
                await attachmentRepository.verifyPermissions(trx, {
                    userId,
                    attachments: meals.flatMap(({ heroImage }) =>
                        heroImage ? [{ attachmentId: heroImage }] : [],
                    ),
                });

            const disallowedAttachmentIds = attachments
                .filter(({ hasPermissions }) => !hasPermissions)
                .map(({ attachmentId }) => attachmentId);

            if (disallowedAttachmentIds.length > 0) {
                throw new NotFoundError("attachment", disallowedAttachmentIds);
            }

            const { recipes: recipePermissions } =
                await recipeRepository.verifyPermissions(trx, {
                    userId,
                    recipes: meals.flatMap(({ recipeId }) =>
                        recipeId ? [{ recipeId }] : [],
                    ),
                    status: "O",
                    includePublic: true,
                });

            const disallowedRecipeIds = recipePermissions
                .filter(({ hasPermissions }) => !hasPermissions)
                .map(({ recipeId }) => recipeId);

            if (disallowedRecipeIds.length > 0) {
                throw new NotFoundError("recipe", disallowedRecipeIds);
            }

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

            const { attachments } =
                await attachmentRepository.verifyPermissions(trx, {
                    userId,
                    attachments: request.heroImage
                        ? [{ attachmentId: request.heroImage }]
                        : [],
                });

            const disallowedAttachmentIds = attachments
                .filter(({ hasPermissions }) => !hasPermissions)
                .map(({ attachmentId }) => attachmentId);

            if (disallowedAttachmentIds.length > 0) {
                throw new NotFoundError("attachment", disallowedAttachmentIds);
            }

            const { recipes: recipePermissions } =
                await recipeRepository.verifyPermissions(trx, {
                    userId,
                    recipes: request.recipeId
                        ? [{ recipeId: request.recipeId }]
                        : [],
                    status: "O",
                    includePublic: true,
                });

            const disallowedRecipeIds = recipePermissions
                .filter(({ hasPermissions }) => !hasPermissions)
                .map(({ recipeId }) => recipeId);

            if (disallowedRecipeIds.length > 0) {
                throw new NotFoundError("recipe", disallowedRecipeIds);
            }

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
