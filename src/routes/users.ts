import express from "express";
import { v4 as Uuid } from "uuid";

import { ListActions, ListItemActions, UserActions } from "../controllers/index.ts";
import { AppError, MessageAction, userMessage } from "../services/index.ts";
import db, { type KnexDatabase } from "../database/index.ts";
import { KnexBookRepository } from "../repositories/knex/knexBookRepository.ts";
import { KnexPlannerRepository } from "../repositories/knex/knexPlannerRepository.ts";
import { KnexRecipeRepository } from "../repositories/knex/knexRecipeRepository.ts";
import { getStatus } from "./helpers/index.ts";
import {
    UserEndpoint,
    UserStatus,
    type DeleteUserRequestParams,
    type DeleteUserResponse,
    type GetPendingUsersRequestBody,
    type GetPendingUsersRequestParams,
    type GetPendingUsersResponse,
    type GetUsersRequestBody,
    type GetUsersRequestParams,
    type GetUsersResponse,
    type PostUserApprovalRequestBody,
    type PostUserApprovalRequestParams,
    type PostUserApprovalResponse,
} from "./spec/index.ts";

const router = express.Router();

/**
 * GET request to fetch all users
 */
router.get<GetUsersRequestParams, GetUsersResponse, GetUsersRequestBody>(
    UserEndpoint.getUsers,
    async ({ session }, res, next) => {
        const isAdmin = session.status === UserStatus.Administrator || session.status === UserStatus.Owner;

        try {
            const users = await UserActions.readAll(db as KnexDatabase as KnexDatabase);

            const data = Object.fromEntries(
                users
                    .filter(({ userId }) => userId !== session.userId)
                    .map(user => [
                        user.userId,
                        {
                            ...user,
                            status: isAdmin ? getStatus(user.status) : undefined,
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
    async ({ session }, res, next) => {
        const isAdmin = session.status === UserStatus.Administrator || session.status === UserStatus.Owner;

        if (!isAdmin) {
            return next(new AppError({ status: 401, message: "Unauthorised action" }));
        }

        try {
            const users = await UserActions.readPending(db as KnexDatabase);

            const data = Object.fromEntries(
                users.map(user => [
                    user.userId,
                    {
                        ...user,
                        status: getStatus(user.status),
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
    async ({ body = {}, params, session }, res, next) => {
        const isAdmin = session.status === UserStatus.Administrator || session.status === UserStatus.Owner;
        const { userId: userToUpdate } = params;
        const { accept } = body;

        if (!isAdmin) {
            return next(new AppError({ status: 401, message: "Unauthorised action" }));
        }

        if (!userToUpdate) {
            return next(new AppError({ status: 400, message: "No user provided" }));
        }

        try {
            const [user] = await UserActions.read(db as KnexDatabase, { userId: userToUpdate });

            if (!user) {
                return next(new AppError({ status: 400, message: "User does not exist" }));
            }

            const [updatedUser] = await UserActions.saveStatus(db as KnexDatabase, {
                userId: userToUpdate,
                status: accept ? UserStatus.Member : UserStatus.Blacklisted,
            });

            if (user.status === UserStatus.Pending && updatedUser?.status === UserStatus.Member && accept) {
                await createDefaultUserData(userToUpdate);
            }

            return res.status(200).json({ error: false });
        } catch (e: unknown) {
            next(
                new AppError({ innerError: e, message: userMessage({ action: MessageAction.Read, entity: "users" }) })
            );
        }
    }
);

/**
 * DELETE request to delete current user account.
 */
router.delete<DeleteUserRequestParams, DeleteUserResponse>(
    UserEndpoint.deleteUsers,
    async ({ params, session }, res, next) => {
        const { userId: userToUpdate } = params;
        const { userId } = session;

        if (userToUpdate !== userId) {
            return next(new AppError({ status: 401, message: "Unauthorised action" }));
        }

        try {
            await UserActions.delete({ userId });

            return res.status(200).json({ error: false });
        } catch (e: unknown) {
            next(
                new AppError({ innerError: e, message: userMessage({ action: MessageAction.Delete, entity: "users" }) })
            );
        }
    }
);

export default router;

const createDefaultUserData = async (userId: string) => {
    const listId = Uuid();
    const listItemId = Uuid();

    await ListActions.Save({
        listId,
        createdBy: userId,
        name: "My Shopping List",
        description: "A list of all the items I need to buy",
    });

    await ListItemActions.Save({
        listId,
        itemId: listItemId,
        createdBy: userId,
        name: "Example item",
        completed: false,
        notes: "You can edit or delete this item by swiping left on it",
    });

    const {
        books: [book],
    } = await KnexBookRepository.create(db as KnexDatabase, {
        userId,
        books: [{ name: "Favourite Recipes", description: "A recipe book for all my favourite recipes" }],
    });

    const { recipes } = await KnexRecipeRepository.create(db as KnexDatabase, {
        userId,
        recipes: [
            {
                name: "Example Recipe",
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
                        description:
                            "Steps can be added in a simple list above, and/or divided into sections like this one",
                        items: [],
                    },
                ],
                tips: "There are many other entries you can use to create your recipe, such as adding a photo, recording the prep/cook time, servings, additional details, source and more.",
            },
        ],
    });

    if (book) {
        await KnexBookRepository.saveRecipes(db as KnexDatabase, { bookId: book.bookId, recipes });
    }

    const { planners } = await KnexPlannerRepository.create(db as KnexDatabase, {
        userId,
        planners: [
            {
                name: "My Meal Planner",
                description: "A planner for all the meals I want to cook",
            },
        ],
    });

    const [planner] = planners;
    const [recipe] = recipes;

    if (planner && recipe) {
        await KnexPlannerRepository.createMeals(db as KnexDatabase, {
            userId,
            plannerId: planner.plannerId,
            meals: [
                {
                    recipeId: recipe.recipeId,
                    year: new Date().getFullYear(),
                    month: new Date().getMonth(),
                    dayOfMonth: new Date().getDate(),
                    course: "lunch",
                },
                {
                    year: new Date().getFullYear(),
                    month: new Date().getMonth(),
                    dayOfMonth: new Date().getDate(),
                    course: "breakfast",
                    description: "Example meal with no recipe",
                },
            ],
        });
    }
};
