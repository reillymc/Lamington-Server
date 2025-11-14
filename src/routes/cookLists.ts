import express from "express";
import { v4 as Uuid } from "uuid";

import { CookListMealActions, CookListMealActionsInternal } from "../controllers/index.ts";
import { AppError, MessageAction, userMessage } from "../services/index.ts";
import { BisectOnValidPartialItems, EnsureDefinedArray } from "../utils/index.ts";
import {
    CookListEndpoint,
    type DeleteCookListMealRequestBody,
    type DeleteCookListMealRequestParams,
    type DeleteCookListMealResponse,
    type GetCookListMealsRequestBody,
    type GetCookListMealsRequestParams,
    type GetCookListMealsResponse,
    type PostCookListMealRequestBody,
    type PostCookListMealRequestParams,
    type PostCookListMealResponse,
    type RequestValidator,
} from "./spec/index.ts";

const router = express.Router();

/**
 * GET request to fetch all cook list meals for a user
 */
router.get<GetCookListMealsRequestParams, GetCookListMealsResponse, GetCookListMealsRequestBody>(
    CookListEndpoint.getMeals,
    async (req, res, next) => {
        const { userId } = req.session;

        // Fetch and return result
        try {
            const data = await CookListMealActions.readMy({ userId });

            return res.status(200).json({ error: false, data });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({ action: MessageAction.Read, entity: "cookList" }),
                })
            );
        }
    }
);

/**
 * POST request to create a cook list meal.
 */
router.post<PostCookListMealRequestParams, PostCookListMealResponse, PostCookListMealRequestBody>(
    CookListEndpoint.postMeal,
    async (req, res, next) => {
        // Extract request fields
        const { userId } = req.session;

        const [validMeals, invalidMeals] = validatePostMealBody(req.body, userId);

        // Check all required fields are present
        if (!validMeals.length || invalidMeals.length) {
            return next(
                new AppError({
                    status: 400,
                    code: "COOK_LIST_INSUFFICIENT_DATA",
                    message: "Insufficient data to create a cook list meal.",
                })
            );
        }

        // Update database and return status
        try {
            const existingMeals = await CookListMealActionsInternal.read(validMeals);

            if (existingMeals.some(meal => meal.createdBy !== userId)) {
                return next(
                    new AppError({
                        status: 403,
                        code: "MEAL_NO_PERMISSIONS",
                        message: "You do not have permissions to edit this meal.",
                    })
                );
            }

            await CookListMealActions.save(validMeals);
            return res.status(201).json({ error: false, message: "Cook list meal added." });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({
                        action: MessageAction.Save,
                        entity: "cook list meal",
                    }),
                })
            );
        }
    }
);
/**
 * DELETE request to delete a cook list meal.
 */
router.delete<DeleteCookListMealRequestParams, DeleteCookListMealResponse, DeleteCookListMealRequestBody>(
    CookListEndpoint.deleteMeal,
    async ({ params, session }, res, next) => {
        // Extract request fields
        const { mealId } = params;
        const { userId } = session;

        // Check all required fields are present
        if (!mealId) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to remove cook list meal.",
                })
            );
        }

        // Update database and return status
        try {
            const [existingMeal] = await CookListMealActionsInternal.read({ mealId });

            if (!existingMeal) {
                return next(
                    new AppError({
                        status: 404,
                        message: "Cannot find meal to delete.",
                    })
                );
            }

            if (existingMeal.createdBy !== userId) {
                return next(
                    new AppError({
                        status: 403,
                        message: "You do not have permissions to delete this meal",
                    })
                );
            }

            await CookListMealActions.delete({ mealId });
            return res.status(201).json({ error: false, message: "CookList meal deleted." });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({ action: MessageAction.Delete, entity: "cook list meal" }),
                })
            );
        }
    }
);

export default router;

const validatePostMealBody: RequestValidator<PostCookListMealRequestBody> = ({ data }, userId) => {
    const filteredData = EnsureDefinedArray(data);

    return BisectOnValidPartialItems(filteredData, item => {
        if (!item.meal) return;

        return {
            mealId: item.mealId ?? Uuid(),
            meal: item.meal,
            sequence: item.sequence,
            source: item.source,
            recipeId: item.recipeId,
            description: item.description,
            heroImage: item.heroImage,
            createdBy: userId,
        };
    });
};
