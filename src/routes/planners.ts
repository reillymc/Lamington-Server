import express from "express";

import { AppError, MessageAction, userMessage } from "../services";
import { InternalPlannerActions, PlannerActions, PlannerMemberActions, PlannerMealActions } from "../controllers";
import {
    PlannerEndpoint,
    Planners,
    DeletePlannerMemberRequestBody,
    DeletePlannerMemberRequestParams,
    DeletePlannerMemberResponse,
    DeletePlannerMealRequestBody,
    DeletePlannerMealRequestParams,
    DeletePlannerMealResponse,
    DeletePlannerRequestBody,
    DeletePlannerRequestParams,
    DeletePlannerResponse,
    GetPlannersRequestBody,
    GetPlannersRequestParams,
    GetPlannersResponse,
    PostPlannerMemberRequestBody,
    PostPlannerMemberRequestParams,
    PostPlannerMemberResponse,
    PostPlannerMealRequestBody,
    PostPlannerMealRequestParams,
    PostPlannerMealResponse,
    PostPlannerRequestBody,
    PostPlannerRequestParams,
    PostPlannerResponse,
    Planner,
    GetPlannerRequestBody,
    GetPlannerRequestParams,
    GetPlannerResponse,
} from "./spec";

const router = express.Router();

/**
 * GET request to fetch all planners for a user
 */
router.get<GetPlannersRequestParams, GetPlannersResponse, GetPlannersRequestBody>(
    PlannerEndpoint.getPlanners,
    async (req, res, next) => {
        const { userId } = req.body;

        // Fetch and return result
        try {
            const results = await PlannerActions.readMy({ userId });
            const data: Planners = Object.fromEntries(
                results.map(planner => [
                    planner.plannerId,
                    {
                        ...planner,
                        createdBy: { userId: planner.createdBy, firstName: planner.createdByName },
                        accepted: planner.createdBy === userId ? true : !!planner.accepted,
                        canEdit: planner.createdBy === userId ? true : !!planner.canEdit,
                    },
                ])
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
    async (req, res, next) => {
        // Extract request fields
        const { plannerId } = req.params;
        const { userId } = req.body;

        if (!plannerId) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to remove planner member.",
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

            const data: Planner = {
                ...planner,
                createdBy: { userId: planner.createdBy, firstName: planner.createdByName },
                members: Object.fromEntries(
                    plannerMembersResponse.map(({ userId, canEdit, firstName, lastName }) => [
                        userId,
                        { userId, permissions: canEdit, firstName, lastName },
                    ])
                ),
                accepted:
                    planner.createdBy === userId
                        ? true
                        : !!plannerMembersResponse.find(({ userId }) => userId === userId)?.accepted,
                canEdit:
                    planner.createdBy === userId
                        ? true
                        : !!plannerMembersResponse.find(({ userId }) => userId === userId)?.canEdit,
            };

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
    async (req, res, next) => {
        // Extract request fields
        const { userId, name, variant, description, plannerId, memberIds = [] } = req.body;

        // Check all required fields are present
        if (!name || !variant) {
            return res.status(400).json({ error: true, message: "Insufficient data to create a planner." });
        }

        // Update database and return status
        try {
            if (plannerId) {
                const [existingPlanner] = await PlannerActions.read({ plannerId, userId });
                if (!existingPlanner) {
                    return res.status(403).json({
                        error: true,
                        message: "Cannot find planner to edit.",
                    });
                }
                if (existingPlanner.createdBy !== userId) {
                    return res.status(403).json({
                        error: true,
                        message: "You do not have permissions to edit this planner",
                    });
                }
            }

            await PlannerActions.save({
                plannerId,
                name,
                variant,
                createdBy: userId,
                description,
                memberIds,
            });
            return res.status(201).json({ error: false, message: `Planner ${plannerId ? "updated" : "created"}` });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({
                        action: plannerId ? MessageAction.Update : MessageAction.Create,
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
    async (req, res, next) => {
        // Extract request fields
        const {
            params: { plannerId },
            body: { userId },
        } = req;

        // Check all required fields are present
        if (!plannerId) {
            return res.status(400).json({ error: true, message: "Insufficient data to delete a planner." });
        }

        // Update database and return status
        try {
            const [existingPlanner] = await PlannerActions.read({ plannerId, userId });

            if (!existingPlanner) {
                return res.status(403).json({
                    error: true,
                    message: "Cannot find planner to delete.",
                });
            }

            if (existingPlanner.createdBy !== userId) {
                return res.status(403).json({
                    error: true,
                    message: "You do not have permissions to delete this planner",
                });
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
 * POST request to create a planner recipe.
 */
router.post<PostPlannerMealRequestParams, PostPlannerMealResponse, PostPlannerMealRequestBody>(
    PlannerEndpoint.postPlannerMeal,
    async (req, res, next) => {
        // Extract request fields
        const { plannerId } = req.params;

        const { id, month, dayOfMonth, meal, year, description, recipeId, userId } = req.body;

        // Check all required fields are present
        if (!id || !plannerId || !meal || !year || !month || !dayOfMonth) {
            return res.status(400).json({
                error: true,
                code: "BOOK_INSUFFICIENT_DATA",
                message: "Insufficient data to create a planner recipe.",
            });
        }

        const plannerMeal = {
            id,
            plannerId,
            meal,
            year,
            month,
            dayOfMonth,
            recipeId,
            description,
            createdBy: userId,
        };

        // Update database and return status
        try {
            const [existingPlanner] = await PlannerActions.read({ plannerId, userId });

            if (!existingPlanner) {
                return res.status(403).json({
                    error: true,
                    code: "BOOK_NOT_FOUND",
                    message: "Cannot find planner to add recipe to.",
                });
            }

            if (existingPlanner.createdBy !== userId) {
                return res.status(403).json({
                    error: true,
                    code: "BOOK_NO_PERMISSIONS",
                    message: "You do not have permissions to edit this planner.",
                });
            }

            await PlannerMealActions.save(plannerMeal);
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
 * POST request to update a planner member.
 */
router.post<PostPlannerMemberRequestParams, PostPlannerMemberResponse, PostPlannerMemberRequestBody>(
    PlannerEndpoint.postPlannerMember,
    async (req, res, next) => {
        // Extract request fields
        const { plannerId } = req.params;

        const { userId, accepted } = req.body;

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

            await PlannerMemberActions.update({ entityId: plannerId, userId, accepted });
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
 * DELETE request to delete a planner recipe.
 */
router.delete<DeletePlannerMealRequestParams, DeletePlannerMealResponse, DeletePlannerMealRequestBody>(
    PlannerEndpoint.deletePlannerMeal,
    async (req, res, next) => {
        // Extract request fields
        const { plannerId, id } = req.params;

        const { userId } = req.body;

        // Check all required fields are present
        if (!plannerId || !id) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to remove planner recipe.",
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
                        message: "Cannot find planner to delete recipe from.",
                    })
                );
            }

            if (existingPlanner.createdBy !== userId) {
                return next(
                    new AppError({
                        status: 403,
                        message: "You do not have permissions to delete recipes from this planner",
                    })
                );
            }

            await PlannerMealActions.delete({ id });
            return res.status(201).json({ error: false, message: "Planner item deleted." });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({ action: MessageAction.Delete, entity: "planner item" }),
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
    async (req, res, next) => {
        // Extract request fields
        const { plannerId, userId: userIdReq } = req.params;

        const { userId } = req.body;

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
