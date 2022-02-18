import express, { Request } from "express";

import { AuthTokenData, checkToken, verifyToken } from "../authentication/auth";
import { createIngredients, CreateIngredientParams, readAllIngredients } from "../api/ingredient";
import { LamingtonAuthenticatedRequest, LamingtonDataResponse } from "../interfaces/response";
import { Ingredient } from "../interfaces/types";

const router = express.Router();

type GetIngredientsRequest = Request<{}, LamingtonDataResponse<Ingredient[]>, AuthTokenData, null>;
type GetIngredientsResponse = LamingtonDataResponse<Ingredient[]>;

/**
 * GET request to fetch all Ingredients
 * Does not require authentication (authentication is only needed to fetch personal meal rating)
 */
router.get("/", checkToken, async (req: GetIngredientsRequest, res: GetIngredientsResponse) => {
    // Extract request fields
    const { userId } = req.body;

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
    const { userId, name, notes } = req.body;

    // Check all required fields are present
    if (!userId || !name) {
        return res.status(400).json({ error: true, message: `Insufficient data to create ingredient` });
    }

    // Update database and return status
    const result = await createIngredients({ name, notes });

    if (result.length === 0) {
        return res.status(500).json({ error: true, message: "Something went wrong rating this ingredient" });
    } else {
        return res
            .status(201)
            .json({ error: false, message: `yay! you've successfully created an ingredient :)`, data: result[0] });
    }
});

export default router;
