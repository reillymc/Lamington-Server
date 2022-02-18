import express from "express";
import db from "../database/db-config";
import { lamington, category } from "../database/definitions";
import { LamingtonDataResponse } from "../interfaces/response";
import { Category } from "../interfaces/types";
const router = express.Router();

/**
 * GET request to fetch all categories
 */
router.get("/categories", async (req, res: LamingtonDataResponse<Category[]>) => {
    db.from(lamington.category)
        .select(category.id, category.name)
        .then((categories: Category[]) => {
            return res.status(200).json({ error: false, data: categories });
        })
        .catch(err => {
            console.log(err);
            return res.json({ error: true, message: err });
        });
});

export default router;
