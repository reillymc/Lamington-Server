import type {
    DeleteRecipeRequest,
    GetRecipeRequest,
    PostRecipeRatingRequest,
    PostRecipeRequest,
    PostRecipeRequestBody,
    PutRecipeRequest,
    PutRecipeRequestBody,
} from "../routes/spec/recipe.ts";
import type {
    ReadAllRequest,
    ReadAllResponse,
    ReadResponse,
    SaveRatingResponse,
} from "../repositories/recipeRepository.ts";
import { BisectOnValidPartialItems, EnsureDefinedArray } from "../utils/index.ts";

import { AppError } from "./logging.ts";
import { type CreateService } from "./service.ts";

export interface RecipeService {
    get: (userId: string, params: GetRecipeRequest) => Promise<ReadResponse["recipes"][number]>;
    getAll: (userId: string, params: Omit<ReadAllRequest, "userId">) => Promise<ReadAllResponse>;
    create: (userId: string, request: PostRecipeRequest["data"]) => Promise<ReadResponse["recipes"]>;
    update: (userId: string, request: PutRecipeRequest["data"]) => Promise<ReadResponse["recipes"]>;
    saveRating: (userId: string, request: PostRecipeRatingRequest) => Promise<SaveRatingResponse["ratings"][number]>;
    delete: (userId: string, request: DeleteRecipeRequest) => Promise<boolean>;
}

export const createRecipeService: CreateService<RecipeService, "recipeRepository"> = (
    database,
    { recipeRepository }
) => ({
    getAll: async (userId, params) => recipeRepository.readAll(database, { ...params, userId }),
    get: async (userId, params) => {
        const { recipes } = await recipeRepository.read(database, { userId, recipes: [params] });
        const [recipe] = recipes;

        if (!recipe) {
            throw new AppError({ status: 404, message: "Recipe not found" });
        }

        return recipe;
    },
    create: (userId, request) =>
        database.transaction(async trx => {
            const [validRecipes, invalidRecipes] = validateCreateRecipeBody(request);

            if (!validRecipes.length || invalidRecipes.length) {
                throw new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to create recipe.",
                });
            }

            const { recipes } = await recipeRepository.create(trx, { userId, recipes: validRecipes });
            return recipes;
        }),
    update: (userId, request) =>
        database.transaction(async trx => {
            const [validRecipes, invalidRecipes] = validateUpdateRecipeBody(request);

            if (!validRecipes.length || invalidRecipes.length) {
                throw new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to update recipe.",
                });
            }

            const permissions = await recipeRepository.verifyPermissions(trx, { userId, recipes: validRecipes });
            const missingPermissions = permissions.recipes.some(({ hasPermissions }) => !hasPermissions);

            if (missingPermissions) {
                throw new AppError({
                    status: 403,
                    code: "RECIPE_NO_PERMISSIONS",
                    message: "You do not have permissions to edit this recipe.",
                });
            }

            const { recipes } = await recipeRepository.update(trx, { userId, recipes: validRecipes });
            return recipes;
        }),
    delete: (userId, request) =>
        database.transaction(async trx => {
            const permissions = await recipeRepository.verifyPermissions(trx, { userId, recipes: [request] });
            const missingPermissions = permissions.recipes.some(({ hasPermissions }) => !hasPermissions);

            if (missingPermissions) {
                throw new AppError({
                    status: 404,
                    message: `Cannot find recipe to delete`,
                });
            }

            const { count } = await recipeRepository.delete(trx, { recipes: [request] });

            if (count !== 1) {
                throw new AppError({
                    status: 500,
                    message: `Failed to delete recipe`,
                });
            }

            return true;
        }),
    saveRating: async (userId, request) => {
        // TODO: move validation to middleware
        if (request.rating === undefined) {
            throw new AppError({ status: 400, message: "No rating provided" });
        }

        const {
            ratings: [rating],
        } = await recipeRepository.saveRating(database, {
            userId,
            ratings: [{ recipeId: request.recipeId, rating: request.rating }],
        });

        if (!rating) {
            throw new AppError({ status: 500, message: "Failed to save rating" });
        }

        return rating;
    },
});

const validateCreateRecipeBody = (data: PostRecipeRequestBody["data"]) => {
    const filteredData = EnsureDefinedArray(data);

    return BisectOnValidPartialItems(filteredData, item => {
        if (!item.name) return;

        return { ...item, name: item.name };
    });
};

const validateUpdateRecipeBody = (data: PutRecipeRequestBody["data"]) => {
    const filteredData = EnsureDefinedArray(data);

    return BisectOnValidPartialItems(filteredData, ({ recipeId, ...item }) => {
        if (!recipeId) return;

        return { ...item, recipeId };
    });
};
