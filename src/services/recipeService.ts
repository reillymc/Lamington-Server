import { Undefined } from "@reillymc/es-utils";
import type { components } from "../routes/spec/index.ts";
import {
    CreatedDataFetchError,
    type CreateService,
    NotFoundError,
    UpdatedDataFetchError,
} from "./service.ts";

export interface RecipeService {
    get: (
        userId: string,
        recipeId: string,
    ) => Promise<components["schemas"]["Recipe"]>;
    getAll: (
        userId: string,
        page?: number,
        search?: string,
        sort?: components["schemas"]["RecipeSortFields"],
        order?: components["schemas"]["Order"],
        owner?: string,
        tags?: ReadonlyArray<string>,
        ingredients?: ReadonlyArray<string>,
    ) => Promise<{
        recipes: ReadonlyArray<components["schemas"]["Recipe"]>;
        nextPage?: number;
    }>;
    create: (
        userId: string,
        request: components["schemas"]["RecipeCreate"],
    ) => Promise<components["schemas"]["Recipe"]>;
    update: (
        userId: string,
        recipeId: string,
        request: components["schemas"]["RecipeUpdate"],
    ) => Promise<components["schemas"]["Recipe"]>;
    saveRating: (
        userId: string,
        recipeId: string,
        rating: number,
    ) => Promise<{ rating: number }>;
    delete: (userId: string, recipeId: string) => Promise<void>;
}

const extractIngredientIds = (
    sections:
        | components["schemas"]["RecipeCreate"]["ingredients"]
        | components["schemas"]["RecipeUpdate"]["ingredients"],
): Array<{ ingredientId: components["schemas"]["Uuid"] }> =>
    (sections ?? []).flatMap(({ items }) =>
        items
            .map(({ ingredient }) =>
                ingredient?.ingredientId ? ingredient : undefined,
            )
            .filter(Undefined),
    );

export const createRecipeService: CreateService<
    RecipeService,
    "recipeRepository" | "ingredientRepository" | "attachmentRepository"
> = (
    database,
    { recipeRepository, ingredientRepository, attachmentRepository },
) => ({
    getAll: async (
        userId,
        page,
        search,
        sort,
        order,
        owner,
        tags,
        ingredients,
    ) => {
        const { recipes, nextPage } = await recipeRepository.readAll(database, {
            userId,
            page,
            sort,
            order,
            filter: {
                name: search,
                owner,
                tags: tags?.map((tagId) => ({ tagId })),
                ingredients: ingredients?.map((ingredientId) => ({
                    ingredientId,
                })),
            },
        });
        return { recipes, nextPage };
    },
    get: async (userId, recipeId) => {
        const { recipes } = await recipeRepository.read(database, {
            userId,
            recipes: [{ recipeId }],
        });
        const [recipe] = recipes;

        if (!recipe) {
            throw new NotFoundError("recipe", recipeId);
        }

        return recipe;
    },
    create: (userId, request) =>
        database.transaction(async (trx) => {
            const { ingredients } =
                await ingredientRepository.verifyPermissions(trx, {
                    userId,
                    ingredients: extractIngredientIds(request.ingredients),
                });

            const disallowedIngredientIds = ingredients
                .filter(({ hasPermissions }) => !hasPermissions)
                .map(({ ingredientId }) => ingredientId);

            if (disallowedIngredientIds.length > 0) {
                throw new NotFoundError("ingredient", disallowedIngredientIds);
            }

            const { attachments } =
                await attachmentRepository.verifyPermissions(trx, {
                    userId,
                    attachments: request.photo?.attachmentId
                        ? [{ attachmentId: request.photo.attachmentId }]
                        : [],
                });

            const disallowedAttachmentIds = attachments
                .filter(({ hasPermissions }) => !hasPermissions)
                .map(({ attachmentId }) => attachmentId);

            if (disallowedAttachmentIds.length > 0) {
                throw new NotFoundError("attachment", disallowedAttachmentIds);
            }

            const { recipes } = await recipeRepository.create(trx, {
                userId,
                recipes: [request],
            });
            const [recipe] = recipes;
            if (!recipe) {
                throw new CreatedDataFetchError("recipe");
            }
            return recipe;
        }),
    update: (userId, recipeId, request) =>
        database.transaction(async (trx) => {
            const permissions = await recipeRepository.verifyPermissions(trx, {
                userId,
                recipes: [{ recipeId }],
                status: "O",
            });
            const missingPermissions = permissions.recipes.some(
                ({ hasPermissions }) => !hasPermissions,
            );

            if (missingPermissions) {
                throw new NotFoundError("recipe", recipeId);
            }

            const { ingredients } =
                await ingredientRepository.verifyPermissions(trx, {
                    userId,
                    ingredients: extractIngredientIds(request.ingredients),
                });

            const disallowedIngredientIds = ingredients
                .filter(({ hasPermissions }) => !hasPermissions)
                .map(({ ingredientId }) => ingredientId);

            if (disallowedIngredientIds.length > 0) {
                throw new NotFoundError("ingredient", disallowedIngredientIds);
            }

            const { attachments } =
                await attachmentRepository.verifyPermissions(trx, {
                    userId,
                    attachments: request.photo?.attachmentId
                        ? [{ attachmentId: request.photo.attachmentId }]
                        : [],
                });

            const disallowedAttachmentIds = attachments
                .filter(({ hasPermissions }) => !hasPermissions)
                .map(({ attachmentId }) => attachmentId);

            if (disallowedAttachmentIds.length > 0) {
                throw new NotFoundError("attachment", disallowedAttachmentIds);
            }

            const { recipes } = await recipeRepository.update(trx, {
                userId,
                recipes: [{ ...request, recipeId }],
            });
            const [recipe] = recipes;
            if (!recipe) {
                throw new UpdatedDataFetchError("recipe", recipeId);
            }
            return recipe;
        }),
    delete: (userId, recipeId) =>
        database.transaction(async (trx) => {
            const permissions = await recipeRepository.verifyPermissions(trx, {
                userId,
                recipes: [{ recipeId }],
                status: "O",
            });
            const missingPermissions = permissions.recipes.some(
                ({ hasPermissions }) => !hasPermissions,
            );

            if (missingPermissions) {
                throw new NotFoundError("recipe", recipeId);
            }

            const { count } = await recipeRepository.delete(trx, {
                recipes: [{ recipeId }],
            });

            if (count !== 1) {
                throw new NotFoundError("recipe", recipeId);
            }
        }),
    saveRating: async (userId, recipeId, ratingValue) => {
        const {
            ratings: [rating],
        } = await recipeRepository.saveRating(database, {
            userId,
            ratings: [{ recipeId, rating: ratingValue }],
        });

        if (!rating) {
            throw new UpdatedDataFetchError("recipe rating", recipeId);
        }

        return { rating: rating.rating };
    },
});
