import express, { Response } from "express";
import db from "../database";
import { MealRoster } from "../interfaces/types";
import { LamingtonDataResponse } from "../interfaces/response";
import { lamington, mealRoster } from "../database";

const router = express.Router();

/**
 * GET request to fetch the meal roster
 */
router.get("/roster", (req, res: Response<LamingtonDataResponse<MealRoster>>) => {
    db.from(lamington.mealRoster)
        .select(
            mealRoster.mealId,
            mealRoster.assigneeId,
            mealRoster.assignmentDate,
            mealRoster.assignerId,
            mealRoster.cooked
        )
        .then(rows => {
            return res.status(200).json({ error: false, data: rows });
        })
        .catch(err => {
            console.log(err);
            return res.json({ error: true, message: err });
        });
});

export default router;
