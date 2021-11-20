import express, { Request, Response } from "express";
import db from "../database/db-config";
import { lamington, categories } from "../database/definitions";
import { LamingtonDataResponse } from "../interfaces/response";
import { Category } from "../interfaces/types";
const router = express.Router();

/**
 * GET request to fetch all categories
 */
router.get("/categories", async (req, res: Response<LamingtonDataResponse<Category[]>>) => {
    db.from(lamington.categories)
        .select(categories.id, categories.name)
        .then((categories: Category[]) => {
            return res.status(200).json({ error: false, data: categories });
        })
        .catch(err => {
            console.log(err);
            return res.json({ error: true, message: err });
        });
});

export default router;
