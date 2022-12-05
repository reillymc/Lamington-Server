import express from "express";

import { AppError, MessageAction, userMessage } from "../services";
import { InternalRecipeActions, RecipeActions, RecipeRatingActions } from "../controllers";
import {
    DeleteRecipeRequestBody,
    DeleteRecipeRequestParams,
    DeleteRecipeResponse,
    GetRecipeRequestBody,
    GetRecipeRequestParams,
    GetRecipeResponse,
    GetRecipesRequestBody,
    GetRecipesRequestParams,
    GetRecipesResponse,
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
 * GET request to fetch a recipe by Id
 * Requires recipe query params
 * Does not require authentication (authentication is needed to fetch personal recipe rating)
 */
router.get<GetRecipeRequestParams, GetRecipeResponse, GetRecipeRequestBody>(
    RecipeEndpoint.getRecipe,
    async (req, res, next) => {
        // Extract request fields
        const { recipeId } = req.params;
        const { userId } = req.body;

        // Check all required fields are present
        if (!recipeId) {
            return res.status(400).json({ error: true, message: `Error getting recipe: Recipe ID not provided.` });
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
 * GET request to fetch all recipes
 * Does not require authentication (authentication is only needed to fetch personal recipe rating)
 */
router.get<GetRecipesRequestParams, GetRecipesResponse, GetRecipesRequestBody>(
    RecipeEndpoint.getRecipes,
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
 * POST request to delete a recipe
 * Requires recipe delete body
 * Requires authentication body
 */
router.delete<DeleteRecipeRequestParams, DeleteRecipeResponse, DeleteRecipeRequestBody>(
    RecipeEndpoint.deleteRecipe,
    async (req, res, next) => {
        // Extract request fields
        const { userId } = req.body;
        const { recipeId } = req.params;

        // Check all required fields are present
        if (!userId || !recipeId) {
            return res
                .status(400)
                .json({ error: true, message: `You haven't given enough information to delete this recipe` });
        }

        // Update database and return status
        try {
            // Check if the delete order came from the recipe creator
            // const recipeDetails: Recipe = await db
            //     .from(lamington.recipe)
            //     .select(recipe.id, recipe.createdBy)
            //     .where({ [recipe.id]: recipeId })
            //     .first();

            // if (recipeDetails.createdBy != userId) {
            //     return res.status(400).json({ error: true, message: `You are not authorised to delete this recipe` });
            // }

            //TODO: remove - should be handled with FK delete policy
            // await db(lamington.recipeRating)
            //     .where({ [recipeRating.recipeId]: recipeId })
            //     .del();
            // await db(lamington.recipeRoster)
            //     .where({ [recipeRoster.recipeId]: recipeId })
            //     .del();
            // await db(lamington.recipeCategory)
            //     .where({ [recipeCategory.recipeId]: recipeId })
            //     .del();
            // await db(lamington.recipe)
            //     .where({ [recipe.recipeId]: recipeId })
            //     .del();
            return res.status(201).json({ error: false, message: `yay! you've successfully deleted this recipe :)` });
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
 * Requires authentication body
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
            if (body.recipeId) {
                const existingRecipe = await InternalRecipeActions.readCreatedByUser(body.recipeId);

                if (!existingRecipe) {
                    return res.status(403).json({
                        error: true,
                        message: `Cannot find recipe to edit`,
                    });
                }

                if (existingRecipe.createdBy !== body.userId) {
                    return res.status(403).json({
                        error: true,
                        message: `Cannot edit a recipe that doesn't belong to you`,
                    });
                }
            }

            await RecipeActions.save({
                recipeId: body.recipeId,
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
                categories: body.categories,
                createdBy: body.userId,
            });
            return res.status(201).json({ error: false, message: `Recipe ${body.recipeId ? "updated" : "created"}` });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({
                        action: body.recipeId ? MessageAction.Update : MessageAction.Read,
                        entity: "recipe",
                    }),
                })
            );
        }

        return res.status(400).json({ error: true, message: `Recipe formatted incorrectly` });
    }
);

/**
 * POST request to rate a recipe
 * Requires recipe rating body
 * Requires authentication body
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
