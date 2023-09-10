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
    GetAllRecipesRequestQuery,
    GetMyRecipesRequestQuery,
} from "./spec";
import { BisectOnValidItems, EnsureDefinedArray } from "../utils";
import { ServiceParams } from "../database";
import { parseRecipeQuery } from "./helpers";

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
            const { result, nextPage } = await RecipeActions.query({ userId, page, ...options });
            const data = Object.fromEntries(result.map(row => [row.recipeId, row]));
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
            const { result, nextPage } = await RecipeActions.queryByUser({ userId, page, ...options });
            const data = Object.fromEntries(result.map(row => [row.recipeId, row]));

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
    async (req, res, next) => {
        // Extract request fields
        const { recipeId } = req.params;
        const { userId } = req.session;

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
            const [data] = await RecipeActions.read({ recipeId, userId });

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
            const [existingRecipe] = await InternalRecipeActions.read({ recipeId });

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
            const existingRecipes = await InternalRecipeActions.read(validRecipes);

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

            await RecipeActions.save(validRecipes);

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
    async (req, res, next) => {
        // Extract request fields
        const { rating } = req.body;
        const { userId } = req.session;
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

const validatePostRecipeBody = ({ data }: PostRecipeRequestBody, userId: string) => {
    const filteredData = EnsureDefinedArray(data);

    return BisectOnValidItems(filteredData, ({ recipeId = Uuid(), name, ...item }) => {
        if (!name) return;

        const validItem: ServiceParams<RecipeActions, "save"> = {
            cookTime: item.cookTime,
            prepTime: item.prepTime,
            servings: item.servings,
            ingredients: item.ingredients,
            method: item.method,
            notes: item.notes,
            photo: item.photo,
            public: item.public ? 1 : 0,
            source: item.source,
            tags: item.tags,
            timesCooked: item.timesCooked,
            ratingPersonal: item.ratingPersonal,
            recipeId,
            name,
            createdBy: userId,
        };

        return validItem;
    });
};
