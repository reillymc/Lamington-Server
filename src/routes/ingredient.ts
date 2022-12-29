import express from "express";

import { AppError, userMessage, MessageAction } from "../services";
import { IngredientActions } from "../controllers";
import {
    GetIngredientsRequestBody,
    GetIngredientsRequestParams,
    GetIngredientsResponse,
    IngredientEndpoint,
    PostIngredientRequestBody,
    PostIngredientRequestParams,
    PostIngredientResponse,
} from "./spec";

const router = express.Router();

/**
 * GET request to fetch all Ingredients
 * Does not require authentication
 */
router.get<GetIngredientsRequestParams, GetIngredientsResponse, GetIngredientsRequestBody>(
    IngredientEndpoint.getIngredients,
    async (req, res, next) => {
        // Fetch and return result
        try {
            const result = await IngredientActions.readAll();

            const data = Object.fromEntries(result.map(row => [row.ingredientId, row]));

            return res.status(200).json({ error: false, data });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({ action: MessageAction.Read, entity: "ingredients" }),
                })
            );
        }
    }
);

/**
 * POST request to create an ingredient.
 */
router.post<PostIngredientRequestParams, PostIngredientResponse, PostIngredientRequestBody>(
    IngredientEndpoint.postIngredient,
    async (req, res, next) => {
        // Extract request fields
        const { name, namePlural, description, userId } = req.body;

        // Check all required fields are present

        if (!name) {
            return next(
                new AppError({
                    message: userMessage({
                        action: "Insufficient data to create ingredient",
                        entity: "ingredient",
                    }),
                })
            );
        }

        // Update database and return status
        try {
            const [result] = await IngredientActions.save({ name, namePlural, description, createdBy: userId });

            if (!result) {
                next(
                    new AppError({
                        message: userMessage({
                            action: "An unknown error occurred when creating ingredient",
                            entity: "ingredient",
                        }),
                        status: 500,
                    })
                );
            }

            return res.status(201).json({ error: false, message: `Ingredient created`, data: result });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({ action: MessageAction.Create, entity: "ingredient" }),
                })
            );
        }
    }
);

export default router;
