import express from "express";
import { v4 as Uuid } from "uuid";

import { AppError, AttachmentService, MessageAction, userMessage } from "../services";
import { InternalRecipeActions, RecipeActions, RecipeRatingActions } from "../controllers";
import {
    DeleteRecipeRequestBody,
    DeleteRecipeRequestParams,
    DeleteRecipeResponse,
    GetRecipeRequestBody,
    GetRecipeRequestParams,
    GetRecipeResponse,
    GetAllRecipesRequestBody,
    GetAllRecipesRequestParams,
    GetAllRecipesResponse,
    GetMyRecipesRequestBody,
    GetMyRecipesRequestParams,
    GetMyRecipesResponse,
    PostRecipeRequestBody,
    PostRecipeRequestParams,
    PostRecipeResponse,
    PostRecipeRatingRequestBody,
    PostRecipeRatingRequestParams,
    PostRecipeRatingResponse,
    RecipeEndpoint,
} from "./spec";

const router = express.Router();

/**
 * GET request to fetch all recipes
 */
router.get<GetAllRecipesRequestParams, GetAllRecipesResponse, GetAllRecipesRequestBody>(
    RecipeEndpoint.getAllRecipes,
    async (req, res, next) => {
        // Extract request fields
        const { userId } = req.body;

        // Fetch and return result
        try {
            const result = await RecipeActions.readAll(userId);
            const data = Object.fromEntries(result.map(row => [row.recipeId, row]));
            return res.status(200).json({ error: false, data });
        } catch (e: unknown) {
            next(
                new AppError({ innerError: e, message: userMessage({ action: MessageAction.Read, entity: "recipes" }) })
            );
        }
    }
);

/**
 * GET request to fetch all recipes by a user
 */
router.get<GetMyRecipesRequestParams, GetMyRecipesResponse, GetMyRecipesRequestBody>(
    RecipeEndpoint.getMyRecipes,
    async (req, res, next) => {
        // Extract request fields
        const { userId } = req.body;

        // Fetch and return result
        try {
            const result = await RecipeActions.readMy(userId);
            const data = Object.fromEntries(result.map(row => [row.recipeId, row]));
            return res.status(200).json({ error: false, data });
        } catch (e: unknown) {
            next(
                new AppError({ innerError: e, message: userMessage({ action: MessageAction.Read, entity: "recipes" }) })
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
    async (req, res, next) => {
        // Extract request fields
        const { recipeId } = req.params;
        const { userId } = req.body;

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
            const data = await RecipeActions.read(recipeId, userId);

            return res.status(200).json({ error: false, data });
        } catch (e: unknown) {
            next(
                new AppError({ innerError: e, message: userMessage({ action: MessageAction.Read, entity: "recipe" }) })
            );
        }
    }
);

/**
 * POST request to delete a recipe
 * Requires recipe delete body
 */
router.delete<DeleteRecipeRequestParams, DeleteRecipeResponse, DeleteRecipeRequestBody>(
    RecipeEndpoint.deleteRecipe,
    async (req, res, next) => {
        // Extract request fields
        const { userId } = req.body;
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
            const existingRecipe = await InternalRecipeActions.read(recipeId);

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

            const data = await RecipeActions.delete(recipeId);

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
 */
router.post<PostRecipeRequestParams, PostRecipeResponse, PostRecipeRequestBody>(
    RecipeEndpoint.postRecipe,
    async ({ body }, res, next) => {
        // Check all required fields are present
        if (!body.name) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to save recipe.",
                })
            );
        }

        try {
            let currentPhoto: string | undefined;

            if (body.recipeId) {
                const existingRecipe = await InternalRecipeActions.read(body.recipeId);

                if (!existingRecipe) {
                    return next(
                        new AppError({
                            status: 403,
                            message: `Cannot find recipe to edit`,
                        })
                    );
                }

                if (existingRecipe.createdBy !== body.userId) {
                    return next(
                        new AppError({
                            status: 403,
                            message: `Cannot edit a recipe that doesn't belong to you`,
                        })
                    );
                }

                currentPhoto = existingRecipe.photo;
            }

            const recipeId = body.recipeId ?? Uuid();

            const isUnsavedImage = AttachmentService.isUnsavedImage(body.userId, "recipe", body.photo);

            if (isUnsavedImage) {
                body.photo = await AttachmentService.saveImage(body.userId, "recipe", recipeId, currentPhoto);
            }

            await RecipeActions.save({
                recipeId,
                name: body.name,
                source: body.source,
                ingredients: body.ingredients,
                method: body.method,
                notes: body.notes,
                ratingPersonal: Math.min(Math.max(body.ratingPersonal ?? 0, 0), 5),
                photo: body.photo,
                servings: body.servings,
                prepTime: body.prepTime,
                cookTime: body.cookTime,
                timesCooked: body.timesCooked,
                tags: body.tags,
                public: body.public,
                userId: body.userId,
            });
            return res.status(201).json({ error: false, message: `Recipe ${body.recipeId ? "updated" : "created"}` });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({
                        action: body.recipeId ? MessageAction.Update : MessageAction.Create,
                        entity: "recipe",
                    }),
                })
            );
        }

        return next(
            new AppError({
                status: 400,
                message: `Recipe formatted incorrectly`,
            })
        );
    }
);

/**
 * POST request to rate a recipe
 * Requires recipe rating body
 */
router.post<PostRecipeRatingRequestParams, PostRecipeRatingResponse, PostRecipeRatingRequestBody>(
    RecipeEndpoint.postRecipeRating,
    async (req, res, next) => {
        // Extract request fields
        const { userId, rating } = req.body;
        const { recipeId } = req.params;

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
