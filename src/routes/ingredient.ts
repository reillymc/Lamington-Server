import express from "express";

import { AppError, userMessage, MessageAction } from "../services";
import { IngredientActions } from "../controllers";
import {
    GetIngredientsRequestBody,
    GetIngredientsRequestParams,
    GetIngredientsRequestQuery,
    GetIngredientsResponse,
    GetMyIngredientsRequestBody,
    GetMyIngredientsRequestParams,
    GetMyIngredientsRequestQuery,
    GetMyIngredientsResponse,
    IngredientEndpoint,
    PostIngredientRequestBody,
    PostIngredientRequestParams,
    PostIngredientResponse,
} from "./spec";
import { parseBaseQuery } from "./helpers";

const router = express.Router();

/**
 * GET request to fetch all Ingredients
 */
router.get<GetIngredientsRequestParams, GetIngredientsResponse, GetIngredientsRequestBody, GetIngredientsRequestQuery>(
    IngredientEndpoint.getIngredients,
    async ({ query }, res, next) => {
        const { page, search, sort } = parseBaseQuery(query);

        try {
            const { result, nextPage } = await IngredientActions.query({ page, search, sort });
            const data = Object.fromEntries(result.map(row => [row.ingredientId, row]));

            return res.status(200).json({ error: false, data, nextPage, page });
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
 * GET request to fetch all Ingredients by user
 */
router.get<
    GetMyIngredientsRequestParams,
    GetMyIngredientsResponse,
    GetMyIngredientsRequestBody,
    GetMyIngredientsRequestQuery
>(IngredientEndpoint.getMyIngredients, async ({ query, session }, res, next) => {
    const { page, search, sort } = parseBaseQuery(query);
    const { userId } = session;

    try {
        const { result, nextPage } = await IngredientActions.queryByUser({ userId, page, search, sort });

        const data = Object.fromEntries(result.map(row => [row.ingredientId, row]));

        return res.status(200).json({ error: false, data, nextPage, page });
    } catch (e: unknown) {
        next(
            new AppError({
                innerError: e,
                message: userMessage({ action: MessageAction.Read, entity: "ingredients" }),
            })
        );
    }
});

/**
 * POST request to create an ingredient.
 */
router.post<PostIngredientRequestParams, PostIngredientResponse, PostIngredientRequestBody>(
    IngredientEndpoint.postIngredient,
    async ({ body, session }, res, next) => {
        // Extract request fields
        const { name, description } = body;
        const { userId } = session;

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
            const [result] = await IngredientActions.save({ name, description, createdBy: userId });

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
