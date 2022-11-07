import express from "express";

import { createCategories, CreateCategoryParams, readAllCategories } from "../controllers/category";
import { AuthenticatedBody } from "../middleware";
import { ResponseBody } from "../spec";
import { AppError, userMessage, MessageAction } from "../services";

const router = express.Router();

export interface Category {
    categoryId: string;
    type: string;
    name: string;
    description?: string;
    mealId?: string;
}

/**
 * GET request to fetch all categories
 * Does not require authentication
 */
router.get<never, ResponseBody<Category[]>, AuthenticatedBody>("/", async (req, res, next) => {
    // Fetch and return result
    try {
        const data = await readAllCategories();

        return res.status(200).json({ error: false, data });
    } catch (e: unknown) {
        next(
            new AppError({ innerError: e, message: userMessage({ action: MessageAction.Read, entity: "categories" }) })
        );
    }
});

/**
 * POST request to create a category.
 */
router.post<never, ResponseBody<Category>, AuthenticatedBody<CreateCategoryParams>>("/", async (req, res, next) => {
    // Extract request fields
    const { name, notes, type } = req.body;

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
    } catch (e: unknown) {
        next(
            new AppError({ innerError: e, message: userMessage({ action: MessageAction.Create, entity: "category" }) })
        );
    }
});

export default router;
