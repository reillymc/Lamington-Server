import express from "express";
import { v4 as Uuid } from "uuid";

import {
    BookActions,
    BookRecipeActions,
    ListActions,
    ListItemActions,
    PlannerActions,
    PlannerMealActions,
    RecipeActions,
    UserActions,
} from "../controllers";
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
    GetPendingUsersRequestBody,
    GetPendingUsersRequestParams,
    GetPendingUsersResponse,
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
 * GET request to fetch pending users
 */
router.get<GetPendingUsersRequestParams, GetPendingUsersResponse, GetPendingUsersRequestBody>(
    UserEndpoint.getPendingUsers,
    async (req, res, next) => {
        const isAdmin = req.body.status === UserStatus.Administrator;

        if (!isAdmin) {
            return next(new AppError({ status: 401, message: "Unauthorised action" }));
        }

        try {
            const users = await UserActions.readPending();

            const data = Object.fromEntries(
                users.map(user => [
                    user.userId,
                    {
                        ...user,
                        status: userStatusToUserStatus(user.status),
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

        const [user] = await UserActions.read({ userId: userToUpdate });

        try {
            const success = UserActions.saveStatus({
                userId: userToUpdate,
                status: accept ? UserStatus.Registered : UserStatus.Blacklisted,
            });

            if (user?.status === UserStatus.Pending && accept) {
                createDefaultUserData(userToUpdate);
            }

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
    const listId = Uuid();
    const listItemId = Uuid();
    const bookId = Uuid();
    const recipeId = Uuid();
    const plannerId = Uuid();

    const list = await ListActions.save({
        listId,
        createdBy: userId,
        name: "My Shopping List",
        description: "A list of all the items I need to buy",
    });

    const listItem = await ListItemActions.save({
        listId,
        itemId: listItemId,
        createdBy: userId,
        name: "Example item",
        completed: false,
        dateAdded: new Date().toISOString().slice(0, 19).replace("T", " "),
        notes: "You can edit or delete this item by swiping left on it",
    });

    const book = await BookActions.save({
        bookId,
        createdBy: userId,
        name: "Favourite Recipes",
        description: "A recipe book for all my favourite recipes",
    });

    const recipe = await RecipeActions.save({
        name: "Example Recipe",
        recipeId,
        userId,
        public: false,
        ingredients: [
            {
                sectionId: Uuid(),
                name: "This is an ingredient section",
                description:
                    "Ingredients can be added in a simple list above, and/or divided into sections like this one",
                items: [],
            },
        ],
        method: [
            {
                sectionId: Uuid(),
                name: "This is a method section",
                description: "Steps can be added in a simple list above, and/or divided into sections like this one",
                items: [],
            },
        ],
        notes: "There are many other entries you can use to create your recipe, such as adding a photo, recording the prep/cook time, servings, additional details, source and more.",
    });

    const bookRecipe = await BookRecipeActions.save({
        bookId,
        recipeId,
    });

    const planner = await PlannerActions.save({
        plannerId,
        createdBy: userId,
        name: "My Meal Planner",
        description: "A planner for all the meals I want to cook",
        variant: "variant1",
    });

    const meal = await PlannerMealActions.save([
        {
            plannerId,
            createdBy: userId,
            id: Uuid(),
            recipeId,
            year: new Date().getFullYear(),
            month: new Date().getMonth(),
            dayOfMonth: new Date().getDate(),
            meal: "lunch",
            description: undefined,
        },
        {
            plannerId,
            createdBy: userId,
            id: Uuid(),
            recipeId: undefined,
            year: new Date().getFullYear(),
            month: new Date().getMonth(),
            dayOfMonth: new Date().getDate(),
            meal: "breakfast",
            description: "Example meal with no recipe",
        },
    ]);
};
