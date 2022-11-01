import express from "express";

import { AuthenticatedBody } from "../../authentication/auth";
import { createIngredients, CreateIngredientParams, readAllIngredients } from "../../database/actions/ingredient";
import { AppError, userMessage, MessageAction } from "../../logging";
import { Ingredient } from "../parameters";
import { ResponseBody } from "../response";

const router = express.Router();

/**
 * GET request to fetch all Ingredients
 * Does not require authentication
 */
router.get<never, ResponseBody<Ingredient[]>, AuthenticatedBody>("/", async (req, res, next) => {
    // Fetch and return result
    try {
        const data = await readAllIngredients();

        return res.status(200).json({ error: false, data });
    } catch (e: unknown) {
        next(
            new AppError({
                message: (e as Error)?.message ?? e,
                userMessage: userMessage({ action: MessageAction.Read, entity: "ingredients" }),
            })
        );
    }
});

/**
 * POST request to create an ingredient.
 */
router.post<never, ResponseBody<Ingredient>, AuthenticatedBody<CreateIngredientParams>>("/", async (req, res, next) => {
    // Extract request fields
    const { name, namePlural, notes } = req.body;

    // Check all required fields are present

    if (!name) {
        return res.status(400).json({ error: true, message: "Insufficient data to create ingredient" });
    }

    // Update database and return status
    try {
        const result = await createIngredients({ name, namePlural, notes });

        if (result.length === 0) {
            return res.status(500).json({ error: true, message: "An unknown error occurred when creating ingredient" });
        } else {
            return res.status(201).json({ error: false, message: `Ingredient created`, data: result[0] });
        }
    } catch (e: unknown) {
        next(
            new AppError({
                message: (e as Error)?.message ?? e,
                userMessage: userMessage({ action: MessageAction.Create, entity: "ingredient" }),
            })
        );
    }
});

export default router;
