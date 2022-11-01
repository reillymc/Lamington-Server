import express from "express";

import { AuthenticatedBody } from "../../authentication/auth";
import { ResponseBody } from "../response";
import UserActions from "../../database/actions/user";
import { Users } from "../specification";
import { AppError, MessageAction, userMessage } from "../../logging";

const router = express.Router();

/**
 * GET request to fetch all users
 */
router.get<never, ResponseBody<Users>, AuthenticatedBody>("/", async (req, res, next) => {
    try {
        const users = await UserActions.readAllUsers();
        const data = Object.fromEntries(users.map(user => [user.userId, user]));
        return res.status(200).json({ error: false, data });
    } catch (e: unknown) {
        next(
            new AppError({
                message: (e as Error)?.message ?? e,
                userMessage: userMessage({ action: MessageAction.Read, entity: "users" }),
            })
        );
    }
});

export default router;
