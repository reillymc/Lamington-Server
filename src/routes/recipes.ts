import express from "express";

import { RecipeActions, RecipeRatingActions } from "../controllers/index.ts";
import { AppError, AttachmentService, MessageAction, userMessage } from "../services/index.ts";
import {
    RecipeQueryResponseToRecipe,
    RecipeReadResponseToRecipe,
    parseRecipeQuery,
    validatePostRecipeBody,
} from "./helpers/index.ts";
import {
    type DeleteRecipeRequestBody,
    type DeleteRecipeRequestParams,
    type DeleteRecipeResponse,
    type GetAllRecipesRequestBody,
    type GetAllRecipesRequestParams,
    type GetAllRecipesRequestQuery,
    type GetAllRecipesResponse,
    type GetMyRecipesRequestBody,
    type GetMyRecipesRequestParams,
    type GetMyRecipesRequestQuery,
    type GetMyRecipesResponse,
    type GetRecipeRequestBody,
    type GetRecipeRequestParams,
    type GetRecipeResponse,
    type PostRecipeRatingRequestBody,
    type PostRecipeRatingRequestParams,
    type PostRecipeRatingResponse,
    type PostRecipeRequestBody,
    type PostRecipeRequestParams,
    type PostRecipeResponse,
    RecipeEndpoint,
} from "./spec/index.ts";

const router = express.Router();

/**
 * GET request to fetch all recipes
 */
router.get<GetAllRecipesRequestParams, GetAllRecipesResponse, GetAllRecipesRequestBody, GetAllRecipesRequestQuery>(
    RecipeEndpoint.getAllRecipes,
    async ({ query, session }, res, next) => {
        // Extract request fields
        const { page, ...options } = parseRecipeQuery(query);
        const { userId } = session;

        // Fetch and return result
        try {
            const { result, nextPage } = await RecipeActions.Query({ userId, page, ...options });
            const data = Object.fromEntries(result.map(row => [row.recipeId, RecipeQueryResponseToRecipe(row)]));
            return res.status(200).json({ error: false, data, page, nextPage });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({ action: MessageAction.Query, entity: "recipes" }),
                })
            );
        }
    }
);

/**
 * GET request to fetch all recipes by a user
 */
router.get<GetMyRecipesRequestParams, GetMyRecipesResponse, GetMyRecipesRequestBody, GetMyRecipesRequestQuery>(
    RecipeEndpoint.getMyRecipes,
    async ({ query, session }, res, next) => {
        // Extract request fields
        const { page, ...options } = parseRecipeQuery(query);
        const { userId } = session;

        // Fetch and return result
        try {
            const { result, nextPage } = await RecipeActions.QueryByUser({ userId, page, ...options });
            const data = Object.fromEntries(result.map(row => [row.recipeId, RecipeQueryResponseToRecipe(row)]));

            return res.status(200).json({ error: false, data, page, nextPage });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({ action: MessageAction.Query, entity: "recipes" }),
                })
            );
        }
    }
);

/**
 * GET request to fetch a recipe by Id
 * Requires recipe query params
 */
router.get<GetRecipeRequestParams, GetRecipeResponse, GetRecipeRequestBody>(
    RecipeEndpoint.getRecipe,
    async ({ params, session }, res, next) => {
        // Extract request fields
        const { recipeId } = params;
        const { userId } = session;

        // Check all required fields are present
        if (!recipeId) {
            return next(
                new AppError({
                    status: 400,
                    message: `Error getting recipe: Recipe ID not provided.`,
                })
            );
        }

        // Fetch and return result
        try {
            const [recipe] = await RecipeActions.Read({ recipeId, userId });

            if (!recipe) {
                return next(
                    new AppError({
                        status: 404,
                        message: `Error getting recipe: Recipe not found.`,
                    })
                );
            }

            const data = RecipeReadResponseToRecipe(recipe);

            return res.status(200).json({ error: false, data });
        } catch (e: unknown) {
            next(
                new AppError({ innerError: e, message: userMessage({ action: MessageAction.Read, entity: "recipe" }) })
            );
        }
    }
);

/**
 * DELETE request to delete a recipe
 * Requires recipe delete body
 */
router.delete<DeleteRecipeRequestParams, DeleteRecipeResponse, DeleteRecipeRequestBody>(
    RecipeEndpoint.deleteRecipe,
    async (req, res, next) => {
        // Extract request fields
        const { userId } = req.session;
        const { recipeId } = req.params;

        // Check all required fields are present
        if (!userId || !recipeId) {
            return next(
                new AppError({
                    status: 400,
                    message: `You haven't given enough information to delete this recipe`,
                })
            );
        }

        // Update database and return status
        try {
            const [existingRecipe] = await RecipeActions.ReadSummary({ recipeId });

            if (!existingRecipe) {
                return next(
                    new AppError({
                        status: 403,
                        message: `Cannot find recipe to delete`,
                    })
                );
            }

            if (existingRecipe.createdBy !== userId) {
                return next(
                    new AppError({
                        status: 403,
                        message: `Cannot delete a recipe that doesn't belong to you`,
                    })
                );
            }

            const data = await RecipeActions.Delete({ recipeId });

            if (existingRecipe.photo) AttachmentService.deleteImage(existingRecipe.photo);

            return res.status(200).json({ error: false });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({ action: MessageAction.Delete, entity: "recipe" }),
                })
            );
        }
    }
);

/**
 * POST request to create a new recipe or update an existing recipe
 * Requires recipe data body
 * Limitation of only one unsaved image at a time is supported.
 */
router.post<PostRecipeRequestParams, PostRecipeResponse, PostRecipeRequestBody>(
    RecipeEndpoint.postRecipe,
    async ({ body, session }, res, next) => {
        // Check all required fields are present
        const { userId } = session;

        const [validRecipes, invalidRecipes] = validatePostRecipeBody(body, userId);

        if (!validRecipes.length || invalidRecipes.length) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to save recipe.",
                })
            );
        }

        try {
            const existingRecipes = await RecipeActions.ReadSummary(validRecipes);

            if (existingRecipes.some(recipe => recipe.createdBy !== userId)) {
                return next(
                    new AppError({
                        status: 403,
                        code: "RECIPE_NO_PERMISSIONS",
                        message: "You do not have permissions to edit this recipe.",
                    })
                );
            }

            for (const recipe of validRecipes) {
                const existingRecipe = existingRecipes.find(({ recipeId }) => recipeId === recipe.recipeId);
                const currentPhoto = existingRecipe?.photo;

                const isUnsavedImage = AttachmentService.isUnsavedImage(userId, "recipe", recipe.photo);

                if (isUnsavedImage) {
                    recipe.photo = await AttachmentService.saveImage(userId, "recipe", recipe.recipeId, currentPhoto);
                }
            }

            await RecipeActions.Save(validRecipes);

            return res.status(201).json({ error: false, message: `Recipe${validRecipes.length > 1 ? "s" : ""} saved` });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({
                        action: MessageAction.Save,
                        entity: "recipe",
                    }),
                })
            );
        }
    }
);

/**
 * POST request to rate a recipe
 * Requires recipe rating body
 */
router.post<PostRecipeRatingRequestParams, PostRecipeRatingResponse, PostRecipeRatingRequestBody>(
    RecipeEndpoint.postRecipeRating,
    async ({ body = {}, session, params }, res, next) => {
        // Extract request fields
        const { rating } = body;
        const { userId } = session;
        const { recipeId } = params;

        // Check all required fields are present
        if (!userId || !recipeId || !rating) {
            return res
                .status(400)
                .json({ error: true, message: `You haven't given enough information to rate this recipe` });
        }

        // Update database and return status
        try {
            await RecipeRatingActions.save({ recipeId, raterId: userId, rating });
            return res.status(201).json({ error: false, message: `yay! you've successfully rated this recipe :)` });
        } catch (e: unknown) {
            next(new AppError({ innerError: e, message: userMessage({ action: "rating", entity: "list" }) }));
        }
    }
);

export default router;
