import express from "express";

import { InternalPlannerActions, PlannerActions, PlannerMealActions, PlannerMemberActions } from "../controllers";
import { AppError, MessageAction, userMessage } from "../services";
import { prepareGetPlannerResponseBody, validatePostPlannerBody, validatePostPlannerMealBody } from "./helpers";
import {
    DeletePlannerMealRequestBody,
    DeletePlannerMealRequestParams,
    DeletePlannerMealResponse,
    DeletePlannerMemberRequestBody,
    DeletePlannerMemberRequestParams,
    DeletePlannerMemberResponse,
    DeletePlannerRequestBody,
    DeletePlannerRequestParams,
    DeletePlannerResponse,
    GetPlannerRequestBody,
    GetPlannerRequestParams,
    GetPlannerResponse,
    GetPlannersRequestBody,
    GetPlannersRequestParams,
    GetPlannersResponse,
    PlannerEndpoint,
    Planners,
    PostPlannerMealRequestBody,
    PostPlannerMealRequestParams,
    PostPlannerMealResponse,
    PostPlannerMemberRequestBody,
    PostPlannerMemberRequestParams,
    PostPlannerMemberResponse,
    PostPlannerRequestBody,
    PostPlannerRequestParams,
    PostPlannerResponse,
    UserStatus,
} from "./spec";

const router = express.Router();

/**
 * GET request to fetch all planners for a user
 */
router.get<GetPlannersRequestParams, GetPlannersResponse, GetPlannersRequestBody>(
    PlannerEndpoint.getPlanners,
    async ({ session }, res, next) => {
        const { userId } = session;

        // Fetch and return result
        try {
            const results = await PlannerActions.readMy({ userId });
            const data: Planners = Object.fromEntries(
                results.map(planner => [planner.plannerId, prepareGetPlannerResponseBody(planner, userId)])
            );

            return res.status(200).json({ error: false, data });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({ action: MessageAction.Read, entity: "planners" }),
                })
            );
        }
    }
);

/**
 * GET request to fetch a planner
 */
router.get<GetPlannerRequestParams, GetPlannerResponse, GetPlannerRequestBody>(
    PlannerEndpoint.getPlanner,
    async ({ params, session }, res, next) => {
        // Extract request fields
        const { plannerId, year, month } = params;
        const { userId } = session;

        let parsedYear = year ? parseInt(year, 10) : undefined;
        let parsedMonth = month ? parseInt(month, 10) : undefined;

        if (!plannerId) {
            return next(
                new AppError({
                    status: 404,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to read planner.",
                })
            );
        }

        // Fetch and return result
        try {
            const [planner] = await PlannerActions.read({ plannerId, userId });
            if (!planner) {
                return next(
                    new AppError({
                        status: 404,
                        code: "NOT_FOUND",
                        message: "Could not find planner.",
                    })
                );
            }

            const plannerMembersResponse = await PlannerMemberActions.read({ entityId: plannerId });

            const plannerMealsResponse =
                parsedYear !== undefined && parsedMonth !== undefined
                    ? await PlannerMealActions.Read({ plannerId, year: parsedYear, month: parsedMonth })
                    : undefined;

            const data = prepareGetPlannerResponseBody(planner, userId, plannerMealsResponse, plannerMembersResponse);

            return res.status(200).json({ error: false, data });
        } catch (e: unknown) {
            next(
                new AppError({ innerError: e, message: userMessage({ action: MessageAction.Read, entity: "planner" }) })
            );
        }
    }
);

/**
 * POST request to create a planner.
 */
router.post<PostPlannerRequestParams, PostPlannerResponse, PostPlannerRequestBody>(
    PlannerEndpoint.postPlanner,
    async ({ body, session }, res, next) => {
        // Extract request fields
        const { userId } = session;
        const [validPlanners, invalidPlanners] = validatePostPlannerBody(body, userId);

        // Check all required fields are present
        if (!validPlanners.length || invalidPlanners.length) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to create a planner.",
                })
            );
        }

        // Update database and return status
        try {
            const existingPlanners = await InternalPlannerActions.read(validPlanners);

            if (existingPlanners.some(recipe => recipe.createdBy !== userId)) {
                return next(
                    new AppError({
                        status: 403,
                        code: "RECIPE_NO_PERMISSIONS",
                        message: "You do not have permissions to edit this planner.",
                    })
                );
            }

            await PlannerActions.save(validPlanners);
            return res.status(201).json({ error: false, message: `Planner saved` });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({
                        action: MessageAction.Save,
                        entity: "planner",
                    }),
                })
            );
        }
    }
);

/**
 * DELETE request to delete a planner.
 */
router.delete<DeletePlannerRequestParams, DeletePlannerResponse, DeletePlannerRequestBody>(
    PlannerEndpoint.deletePlanner,
    async ({ params, session }, res, next) => {
        // Extract request fields
        const { plannerId } = params;
        const { userId } = session;

        // Check all required fields are present
        if (!plannerId) {
            return next(
                new AppError({
                    status: 400,
                    message: "Insufficient data to delete a planner.",
                })
            );
        }

        // Update database and return status
        try {
            const [existingPlanner] = await PlannerActions.read({ plannerId, userId });

            if (!existingPlanner) {
                return next(
                    new AppError({
                        status: 403,
                        message: "Cannot find planner to delete.",
                    })
                );
            }

            if (existingPlanner.createdBy !== userId) {
                return next(
                    new AppError({
                        status: 403,
                        message: "You do not have permissions to delete this planner",
                    })
                );
            }

            await PlannerActions.delete({ plannerId });
            return res.status(201).json({ error: false, message: "Planner deleted." });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({ action: MessageAction.Delete, entity: "planner" }),
                })
            );
        }
    }
);

/**
 * POST request to save a planner meal.
 */
router.post<PostPlannerMealRequestParams, PostPlannerMealResponse, PostPlannerMealRequestBody>(
    PlannerEndpoint.postPlannerMeal,
    async ({ params, body, session }, res, next) => {
        // Extract request fields
        const { plannerId } = params;
        const { userId } = session;
        const [validPlannerMeals, invalidPlannerMeals] = validatePostPlannerMealBody(body, userId, plannerId);

        // Check all required fields are present
        if (!validPlannerMeals.length || invalidPlannerMeals.length) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to create a planner recipe.",
                })
            );
        }

        // Update database and return status
        try {
            const [existingPlanner] = await PlannerActions.read({ plannerId, userId });

            if (!existingPlanner) {
                return next(
                    new AppError({
                        status: 404,
                        code: "PLANNER_NOT_FOUND",
                        message: "Cannot find planner to add recipe to.",
                    })
                );
            }

            if (existingPlanner.createdBy !== userId) {
                const existingPlannerMembers = await PlannerMemberActions.read({ entityId: plannerId });

                if (
                    !existingPlannerMembers?.some(
                        member => member.userId === userId && member.status === UserStatus.Administrator
                    )
                ) {
                    return next(
                        new AppError({
                            status: 403,
                            code: "PLANNER_NO_PERMISSIONS",
                            message: "You do not have permissions to edit this planner.",
                        })
                    );
                }
            }

            await PlannerMealActions.Save(validPlannerMeals);
            return res.status(201).json({ error: false, message: "Planner recipe added." });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({
                        action: plannerId ? MessageAction.Update : MessageAction.Create,
                        entity: "planner recipe",
                    }),
                })
            );
        }
    }
);

/**
 * POST request to update a planner member. Currently only used to accept self into a planner.
 */
router.post<PostPlannerMemberRequestParams, PostPlannerMemberResponse, PostPlannerMemberRequestBody>(
    PlannerEndpoint.postPlannerMember,
    async ({ params, session }, res, next) => {
        // Extract request fields
        const { plannerId } = params;
        const { userId } = session;

        // Check all required fields are present
        if (!plannerId) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to update planner member.",
                })
            );
        }

        // Update database and return status
        try {
            const [existingPlanner] = await InternalPlannerActions.read({ plannerId });
            if (!existingPlanner) {
                return next(
                    new AppError({
                        status: 403,
                        code: "NOT_FOUND",
                        message: "Planner not found.",
                    })
                );
            }

            const plannerMembers = await PlannerMemberActions.read({ entityId: plannerId });

            if (!plannerMembers?.some(member => member.userId === userId)) {
                return next(
                    new AppError({
                        status: 403,
                        code: "NO_PERMISSIONS",
                        message: "You are not a member of this planner.",
                    })
                );
            }

            await PlannerMemberActions.save({ plannerId, members: [{ userId, status: UserStatus.Member }] });
            return res.status(201).json({ error: false, message: "Planner member removed." });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({
                        action: MessageAction.Delete,
                        entity: "planner member",
                    }),
                })
            );
        }
    }
);

/**
 * DELETE request to delete a planner meal.
 */
router.delete<DeletePlannerMealRequestParams, DeletePlannerMealResponse, DeletePlannerMealRequestBody>(
    PlannerEndpoint.deletePlannerMeal,
    async ({ params, session }, res, next) => {
        // Extract request fields
        const { plannerId, mealId } = params;
        const { userId } = session;

        // Check all required fields are present
        if (!plannerId || !mealId) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to remove planner meal.",
                })
            );
        }

        // Update database and return status
        try {
            const [existingPlanner] = await PlannerActions.read({ plannerId, userId });

            if (!existingPlanner) {
                return next(
                    new AppError({
                        status: 403,
                        message: "Cannot find planner to delete meal from.",
                    })
                );
            }

            if (existingPlanner.createdBy !== userId) {
                const existingPlannerMembers = await PlannerMemberActions.read({ entityId: plannerId });

                if (
                    !existingPlannerMembers?.some(
                        member => member.userId === userId && member.status === UserStatus.Administrator
                    )
                ) {
                    return next(
                        new AppError({
                            status: 403,
                            message: "You do not have permissions to delete meals from this planner",
                        })
                    );
                }
            }

            await PlannerMealActions.Delete({ id: mealId });
            return res.status(201).json({ error: false, message: "Planner meal deleted." });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({ action: MessageAction.Delete, entity: "planner meal" }),
                })
            );
        }
    }
);

/**
 * DELETE request to delete a planner member.
 */
router.delete<DeletePlannerMemberRequestParams, DeletePlannerMemberResponse, DeletePlannerMemberRequestBody>(
    PlannerEndpoint.deletePlannerMember,
    async ({ params, session }, res, next) => {
        // Extract request fields
        const { plannerId, userId: userIdReq } = params;
        const { userId } = session;

        const userToDelete = userIdReq || userId;

        // Check all required fields are present
        if (!userToDelete || !plannerId) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to remove planner member.",
                })
            );
        }

        // Update database and return status
        try {
            const [existingPlanner] = await InternalPlannerActions.read({ plannerId });
            if (!existingPlanner) {
                return next(
                    new AppError({
                        status: 403,
                        code: "NOT_FOUND",
                        message: "Cannot find planner to remove member from.",
                    })
                );
            }

            if (existingPlanner.createdBy === userToDelete) {
                return next(
                    new AppError({
                        status: 403,
                        code: "OWNER",
                        message: "You cannot leave a planner you own.",
                    })
                );
            }

            if (userIdReq && userId !== userIdReq && existingPlanner.createdBy !== userId) {
                return next(
                    new AppError({
                        status: 403,
                        code: "NO_PERMISSIONS",
                        message: "You do not have permissions to remove planner member.",
                    })
                );
            }

            await PlannerMemberActions.delete({ entityId: plannerId, userId: userToDelete });
            return res.status(201).json({ error: false, message: "Planner member removed." });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({
                        action: MessageAction.Delete,
                        entity: "planner member",
                    }),
                })
            );
        }
    }
);

export default router;
