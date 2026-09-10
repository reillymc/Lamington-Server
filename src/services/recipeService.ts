import type { components } from "../routes/spec/index.ts";
import {
    CreatedDataFetchError,
    createService,
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

export const createRecipeService = createService<
    RecipeService,
    "recipeRepository"
>(({ recipeRepository }) => ({
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
        const { recipes, nextPage } = await recipeRepository.readAll({
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
        const { recipes } = await recipeRepository.read({
            userId,
            recipes: [{ recipeId }],
        });
        const [recipe] = recipes;

        if (!recipe) {
            throw new NotFoundError("recipe", recipeId);
        }

        return recipe;
    },
    create: async (userId, request) => {
        const { recipes } = await recipeRepository.create({
            userId,
            recipes: [request],
        });
        const [recipe] = recipes;
        if (!recipe) {
            throw new CreatedDataFetchError("recipe");
        }
        return recipe;
    },
    update: async (userId, recipeId, request) => {
        const permissions = await recipeRepository.verifyPermissions({
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

        const { recipes } = await recipeRepository.update({
            userId,
            recipes: [{ ...request, recipeId }],
        });
        const [recipe] = recipes;
        if (!recipe) {
            throw new UpdatedDataFetchError("recipe", recipeId);
        }
        return recipe;
    },
    delete: async (userId, recipeId) => {
        const permissions = await recipeRepository.verifyPermissions({
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

        const { count } = await recipeRepository.delete({
            recipes: [{ recipeId }],
        });

        if (count !== 1) {
            throw new NotFoundError("recipe", recipeId);
        }
    },
    saveRating: async (userId, recipeId, ratingValue) => {
        const {
            ratings: [rating],
        } = await recipeRepository.saveRating({
            userId,
            ratings: [{ recipeId, rating: ratingValue }],
        });

        if (!rating) {
            throw new UpdatedDataFetchError("recipe rating", recipeId);
        }

        return { rating: rating.rating };
    },
}));
