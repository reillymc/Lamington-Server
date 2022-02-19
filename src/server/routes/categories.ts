import express, { Request } from "express";

import { createCategories, CreateCategoryParams, readAllCategories } from "../../database/actions";
import { AuthTokenData, checkToken, verifyToken } from "../../authentication/auth";
import { LamingtonAuthenticatedRequest, LamingtonDataResponse } from "../response";
import { Category } from "../parameters";
import { UnauthenticatedResponse } from "./helper";

const router = express.Router();

type GetCategoriesRequest = Request<{}, LamingtonDataResponse<Category[]>, AuthTokenData, null>;
type GetCategoriesResponse = LamingtonDataResponse<Category[]>;

/**
 * GET request to fetch all categories
 * Does not require authentication
 */
router.get("/", checkToken, async (req: GetCategoriesRequest, res: GetCategoriesResponse) => {
    // Fetch and return result
    try {
        const data = await readAllCategories();

        return res.status(200).json({ error: false, data });
    } catch (exception: unknown) {
        return res.status(500).json({ error: true, message: "Error fetching data." + exception });
    }
});


type CreateCategoryRequest = LamingtonAuthenticatedRequest<CreateCategoryParams>;
type CreateCategoryResponse = LamingtonDataResponse<Category>;
/**
 * POST request to create a category.
 */
router.post("/", verifyToken, async (req: CreateCategoryRequest, res: CreateCategoryResponse) => {
    // Extract request fields
    const { userId, name, notes, type } = req.body;

    // Check all required fields are present
    if (!userId) return UnauthenticatedResponse(res); // This should be handled within verifyToken

    if (!name || !type) {
        return res.status(400).json({ error: true, message: "Insufficient data to create category" });
    }

    // Update database and return status
    try {
        const result = await createCategories({ name, type, notes });

        if (result.length === 0) {
            return res.status(500).json({ error: true, message: "An unknown error occurred when creating category" });
        } else {
            return res.status(201).json({ error: false, message: `Category created`, data: result[0] });
        }
    } catch (exception: unknown) {
        return res.status(500).json({ error: true, message: "Internal processing error." + exception });
    }
});

export default router;
