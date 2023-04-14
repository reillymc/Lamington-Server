import express from "express";

import { BookActions, ListActions, PlannerActions, UserActions } from "../controllers";
import { userStatusToUserStatus } from "../controllers/helpers";
import { AppError, MessageAction, userMessage } from "../services";
import {
    GetUsersRequestParams,
    GetUsersResponse,
    GetUsersRequestBody,
    UserEndpoint,
    UserStatus,
    PostUserApprovalRequestParams,
    PostUserApprovalResponse,
    PostUserApprovalRequestBody,
} from "./spec";

const router = express.Router();

/**
 * GET request to fetch all users
 */
router.get<GetUsersRequestParams, GetUsersResponse, GetUsersRequestBody>(
    UserEndpoint.getUsers,
    async (req, res, next) => {
        const isAdmin = req.body.status === UserStatus.Administrator;

        try {
            const users = await UserActions.readAll();

            const data = Object.fromEntries(
                users.map(user => [
                    user.userId,
                    {
                        ...user,
                        status: isAdmin ? userStatusToUserStatus(user.status) : undefined,
                        email: isAdmin ? user.email : undefined,
                    },
                ])
            );

            return res.status(200).json({ error: false, data });
        } catch (e: unknown) {
            next(
                new AppError({ innerError: e, message: userMessage({ action: MessageAction.Read, entity: "users" }) })
            );
        }
    }
);

/**
 * POST request to approve a user's registration
 */
router.post<PostUserApprovalRequestParams, PostUserApprovalResponse, PostUserApprovalRequestBody>(
    UserEndpoint.approveUser,
    async (req, res, next) => {
        const isAdmin = req.body.status === UserStatus.Administrator;

        if (!isAdmin) {
            return next(new AppError({ status: 401, message: "Unauthorised action" }));
        }

        const { userId: userToUpdate } = req.params;
        const { accept } = req.body;

        if (!userToUpdate) {
            return next(new AppError({ status: 400, message: "No user provided" }));
        }

        try {
            const success = UserActions.saveStatus({
                userId: userToUpdate,
                status: accept ? UserStatus.Registered : UserStatus.Blacklisted,
            });

            createDefaultUserData(userToUpdate);

            return res.status(200).json({ error: false });
        } catch (e: unknown) {
            next(
                new AppError({ innerError: e, message: userMessage({ action: MessageAction.Read, entity: "users" }) })
            );
        }
    }
);

export default router;

const createDefaultUserData = async (userId: string) => {
    const book = await BookActions.save({
        createdBy: userId,
        name: "Favourite Recipes",
        description: "A recipe book for all my favourite recipes",
    });

    const list = await ListActions.save({
        createdBy: userId,
        name: "My Shopping List",
        description: "A list of all the items I need to buy",
    });

    const planner = await PlannerActions.save({
        createdBy: userId,
        name: "My Meal Planner",
        description: "A planner for all the meals I want to cook",
        variant: "variant1",
    });
};
