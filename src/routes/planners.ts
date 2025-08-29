import express from "express";

import { PlannerActions, PlannerMealActions, PlannerMemberActions } from "../controllers/index.ts";
import {
    AppError,
    InsufficientDataError,
    MessageAction,
    NotFoundError,
    PermissionError,
    userMessage,
} from "../services/index.ts";
import {
    prepareGetPlannerResponseBody,
    validatePlannerPermissions,
    validatePostPlannerBody,
    validatePostPlannerMealBody,
} from "./helpers/index.ts";
import {
    type DeletePlannerMealRequestBody,
    type DeletePlannerMealRequestParams,
    type DeletePlannerMealResponse,
    type DeletePlannerMemberRequestBody,
    type DeletePlannerMemberRequestParams,
    type DeletePlannerMemberResponse,
    type DeletePlannerRequestBody,
    type DeletePlannerRequestParams,
    type DeletePlannerResponse,
    type GetPlannerRequestBody,
    type GetPlannerRequestParams,
    type GetPlannerResponse,
    type GetPlannersRequestBody,
    type GetPlannersRequestParams,
    type GetPlannersResponse,
    PlannerEndpoint,
    type Planners,
    type PostPlannerMealRequestBody,
    type PostPlannerMealRequestParams,
    type PostPlannerMealResponse,
    type PostPlannerMemberRequestBody,
    type PostPlannerMemberRequestParams,
    type PostPlannerMemberResponse,
    type PostPlannerRequestBody,
    type PostPlannerRequestParams,
    type PostPlannerResponse,
    UserStatus,
} from "./spec/index.ts";

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
            const results = await PlannerActions.ReadByUser({ userId });
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

        if (!plannerId) return next(new InsufficientDataError("planner"));

        // Fetch and return result
        try {
            const [planner] = await PlannerActions.Read({ plannerId, userId });
            if (!planner) return next(new NotFoundError("planner", plannerId));

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
            return next(new InsufficientDataError("planner"));
        }

        // Update database and return status
        try {
            const { permissionsValid } = await validatePlannerPermissions(
                validPlanners.map(({ plannerId }) => plannerId),
                userId,
                UserStatus.Owner
            );

            if (!permissionsValid) return next(new PermissionError("planner"));

            await PlannerActions.Save(validPlanners);
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
        if (!plannerId) return next(new InsufficientDataError("planner"));

        // Update database and return status
        try {
            const { permissionsValid, missingPlanners } = await validatePlannerPermissions(
                plannerId,
                userId,
                UserStatus.Owner
            );

            if (missingPlanners.length) return next(new NotFoundError("planner", missingPlanners));

            if (!permissionsValid) return next(new PermissionError("planner"));

            await PlannerActions.Delete({ plannerId });
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
            return next(new InsufficientDataError("planner meal"));
        }

        // Update database and return status
        try {
            const { permissionsValid, missingPlanners } = await validatePlannerPermissions(
                plannerId,
                userId,
                UserStatus.Administrator
            );

            if (missingPlanners.length) return next(new NotFoundError("planner", missingPlanners));

            if (!permissionsValid) return next(new PermissionError("planner meal"));

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
        if (!plannerId) return next(new InsufficientDataError("planner member"));

        // Update database and return status
        try {
            const { permissionsValid, missingPlanners } = await validatePlannerPermissions(
                plannerId,
                userId,
                UserStatus.Pending
            );

            if (missingPlanners.length) return next(new NotFoundError("planner", missingPlanners));

            if (!permissionsValid) return next(new PermissionError("planner member"));

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
        if (!plannerId || !mealId) return next(new InsufficientDataError("planner meal"));

        // Update database and return status
        try {
            const { permissionsValid, missingPlanners } = await validatePlannerPermissions(
                plannerId,
                userId,
                UserStatus.Administrator
            );

            if (missingPlanners.length) return next(new NotFoundError("planner", missingPlanners));

            if (!permissionsValid) return next(new PermissionError("planner item"));

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
        if (!userToDelete || !plannerId) return next(new InsufficientDataError("planner member"));

        // Update database and return status
        try {
            const [existingPlanner] = await PlannerActions.ReadPermissions({ plannerId, userId });
            if (!existingPlanner) return next(new NotFoundError("planner", plannerId));

            if (userIdReq && userId !== userIdReq && existingPlanner.createdBy !== userId) {
                return next(new PermissionError("planner member"));
            }

            if (existingPlanner.createdBy === userToDelete) {
                return next(
                    new AppError({
                        status: 400,
                        code: "OWNER",
                        message: "Cannot remove planner owner from planner.",
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
