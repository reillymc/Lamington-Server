import express, { Request } from "express";

import { AuthTokenData, checkToken, verifyToken } from "../../authentication/auth";
import { createIngredients, CreateIngredientParams, readAllIngredients } from "../../database/actions/ingredient";
import { LamingtonAuthenticatedRequest, LamingtonDataResponse } from "../response";
import { Ingredient } from "../parameters";
import { UnauthenticatedResponse } from "./helper";

const router = express.Router();

type GetIngredientsRequest = Request<{}, LamingtonDataResponse<Ingredient[]>, AuthTokenData, null>;
type GetIngredientsResponse = LamingtonDataResponse<Ingredient[]>;

/**
 * GET request to fetch all Ingredients
 * Does not require authentication
 */
router.get("/", checkToken, async (req: GetIngredientsRequest, res: GetIngredientsResponse) => {
    // Fetch and return result
    try {
        const data = await readAllIngredients();

        return res.status(200).json({ error: false, data });
    } catch (exception: unknown) {
        return res.status(500).json({ error: true, message: "Error fetching data." + exception });
    }
});

type CreateIngredientRequest = LamingtonAuthenticatedRequest<CreateIngredientParams>;
type CreateIngredientResponse = LamingtonDataResponse<Ingredient>;
/**
 * POST request to create an ingredient.
 */
router.post("/", verifyToken, async (req: CreateIngredientRequest, res: CreateIngredientResponse) => {
    // Extract request fields
    const { userId, name, namePlural, notes } = req.body;

    // Check all required fields are present
    if (!userId) return UnauthenticatedResponse(res);

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
    } catch (exception: unknown) {
        return res.status(500).json({ error: true, message: "Internal processing error." + exception });
    }
});

export default router;

