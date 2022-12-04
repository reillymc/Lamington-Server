import express from "express";

import { UserActions } from "../controllers";
import { AppError, MessageAction, userMessage } from "../services";
import { GetUsersRequestParams, GetUsersResponse, GetUsersRequestBody } from "./spec";

const router = express.Router();

/**
 * GET request to fetch all users
 */
router.get<GetUsersRequestParams, GetUsersResponse, GetUsersRequestBody>("/", async (req, res, next) => {
    try {
        const users = await UserActions.readAll();
        const data = Object.fromEntries(users.map(user => [user.userId, user]));
        return res.status(200).json({ error: false, data });
    } catch (e: unknown) {
        next(new AppError({ innerError: e, message: userMessage({ action: MessageAction.Read, entity: "users" }) }));
    }
});

export default router;
