import express from "express";

import { AuthenticatedBody } from "../middleware";
import { ResponseBody } from "../spec";
import UserActions from "../controllers/user";
import { AppError, MessageAction, userMessage } from "../services";

const router = express.Router();

/**
 * User
 */
export type User = {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    created: string;
    status: string;
};

/**
 * Users
 */
export type Users = {
    [userId: string]: User;
};

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
