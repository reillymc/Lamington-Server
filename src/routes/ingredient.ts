import express from "express";
import { v4 as Uuid } from "uuid";

import { IngredientActions } from "../controllers/index.ts";
import type { ServiceParams } from "../database/index.ts";
import { AppError, MessageAction, userMessage } from "../services/index.ts";
import { BisectOnValidItems, EnsureDefinedArray } from "../utils/index.ts";
import { parseBaseQuery } from "./helpers/index.ts";
import {
    type GetIngredientsRequestBody,
    type GetIngredientsRequestParams,
    type GetIngredientsRequestQuery,
    type GetIngredientsResponse,
    type GetMyIngredientsRequestBody,
    type GetMyIngredientsRequestParams,
    type GetMyIngredientsRequestQuery,
    type GetMyIngredientsResponse,
    IngredientEndpoint,
    type PostIngredientRequestBody,
    type PostIngredientRequestParams,
    type PostIngredientResponse,
} from "./spec/index.ts";

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
        const { userId } = session;
        const [validIngredients, invalidIngredients] = validatePostIngredientBody(body, userId);

        // Check all required fields are present

        if (!validIngredients.length || invalidIngredients.length) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: userMessage({
                        action: "Insufficient data to create ingredient",
                        entity: "ingredient",
                    }),
                })
            );
        }

        // Update database and return status
        try {
            const [result] = await IngredientActions.save(validIngredients);

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

const validatePostIngredientBody = ({ data }: PostIngredientRequestBody, userId: string) => {
    const filteredData = EnsureDefinedArray(data);

    return BisectOnValidItems(filteredData, ({ name, ...item }) => {
        if (!name) return;

        const validItem: ServiceParams<IngredientActions, "save"> = {
            ingredientId: Uuid(), // Currently updating is not supported
            name,
            description: item.description,
            photo: item.photo,
            createdBy: userId,
        };

        return validItem;
    });
};
