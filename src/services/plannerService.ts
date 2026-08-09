import { ForeignKeyViolationError } from "../repositories/common/errors.ts";
import type { components } from "../routes/spec/index.ts";
import {
    CreatedDataFetchError,
    createService,
    InvalidOperationError,
    NotFoundError,
    UpdatedDataFetchError,
} from "./service.ts";

export interface PlannerService {
    getAll: (
        userId: string,
    ) => Promise<ReadonlyArray<components["schemas"]["Planner"]>>;
    get: (
        userId: string,
        plannerId: string,
    ) => Promise<components["schemas"]["Planner"]>;
    create: (
        userId: string,
        request: components["schemas"]["PlannerCreate"],
    ) => Promise<components["schemas"]["Planner"]>;
    update: (
        userId: string,
        plannerId: string,
        request: components["schemas"]["PlannerUpdate"],
    ) => Promise<components["schemas"]["Planner"]>;
    delete: (userId: string, plannerId: string) => Promise<void>;
    getMeals: (
        userId: string,
        plannerId: string,
        year: number,
        month: number,
    ) => Promise<ReadonlyArray<components["schemas"]["PlannerMeal"]>>;
    createMeals: (
        userId: string,
        plannerId: string,
        meals: ReadonlyArray<components["schemas"]["PlannerMealCreate"]>,
    ) => Promise<ReadonlyArray<components["schemas"]["PlannerMeal"]>>;
    updateMeal: (
        userId: string,
        plannerId: string,
        mealId: string,
        meal: components["schemas"]["PlannerMealUpdate"],
    ) => Promise<components["schemas"]["PlannerMeal"]>;
    deleteMeal: (
        userId: string,
        plannerId: string,
        mealId: string,
    ) => Promise<void>;
    getMembers: (
        userId: string,
        plannerId: string,
    ) => Promise<ReadonlyArray<components["schemas"]["Member"]>>;
    inviteMember: (
        userId: string,
        plannerId: string,
        targetUserId: string,
    ) => Promise<void>;
    updateMember: (
        userId: string,
        plannerId: string,
        memberId: string,
        status: components["schemas"]["MemberUpdateStatus"],
    ) => Promise<components["schemas"]["Member"]>;
    removeMember: (
        userId: string,
        plannerId: string,
        memberId: string,
    ) => Promise<void>;
    acceptInvite: (userId: string, plannerId: string) => Promise<void>;
    declineInvite: (userId: string, plannerId: string) => Promise<void>;
    leavePlanner: (userId: string, plannerId: string) => Promise<void>;
}

export const createPlannerService = createService<
    PlannerService,
    "plannerRepository"
>(({ plannerRepository }) => ({
    getAll: async (userId) => {
        const { planners } = await plannerRepository.readAll({
            userId,
        });
        return planners;
    },
    get: async (userId, plannerId) => {
        const {
            planners: [planner],
        } = await plannerRepository.read({
            userId,
            planners: [{ plannerId }],
        });

        if (!planner) {
            throw new NotFoundError("planner", plannerId);
        }

        return planner;
    },
    create: async (userId, request) => {
        const { planners } = await plannerRepository.create({
            userId,
            planners: [request],
        });

        const [planner] = planners;

        if (!planner) {
            throw new CreatedDataFetchError("planner");
        }

        return planner;
    },
    update: async (userId, plannerId, request) => {
        const permissions = await plannerRepository.verifyPermissions({
            userId,
            planners: [{ plannerId }],
            status: "O",
        });

        if (
            permissions.planners.some(({ hasPermissions }) => !hasPermissions)
        ) {
            throw new NotFoundError("planner", plannerId);
        }

        const { planners } = await plannerRepository.update({
            userId,
            planners: [{ ...request, plannerId }],
        });

        const [planner] = planners;
        if (!planner) {
            throw new UpdatedDataFetchError("planner", plannerId);
        }
        return planner;
    },
    delete: async (userId, plannerId) => {
        const permissions = await plannerRepository.verifyPermissions({
            userId,
            planners: [{ plannerId }],
            status: "O",
        });

        if (
            permissions.planners.some(({ hasPermissions }) => !hasPermissions)
        ) {
            throw new NotFoundError("planner", plannerId);
        }

        await plannerRepository.delete({ planners: [{ plannerId }] });
    },
    createMeals: async (userId, plannerId, meals) => {
        const permissions = await plannerRepository.verifyPermissions({
            userId,
            planners: [{ plannerId }],
            status: ["O", "A"],
        });

        if (
            permissions.planners.some(({ hasPermissions }) => !hasPermissions)
        ) {
            throw new NotFoundError("planner", plannerId);
        }

        const { meals: createdMeals } = await plannerRepository.createMeals({
            plannerId,
            userId,
            meals,
        });

        if (createdMeals.length !== meals.length) {
            throw new CreatedDataFetchError("planner meal");
        }

        return createdMeals;
    },
    getMeals: async (userId, plannerId, year, month) => {
        const permissions = await plannerRepository.verifyPermissions({
            userId,
            planners: [{ plannerId }],
            status: ["O", "A", "M"],
        });

        if (
            permissions.planners.some(({ hasPermissions }) => !hasPermissions)
        ) {
            throw new NotFoundError("planner", plannerId);
        }

        const { meals } = await plannerRepository.readAllMeals({
            userId,
            filter: {
                plannerId,
                month,
                year,
            },
        });
        return meals;
    },
    updateMeal: async (userId, plannerId, mealId, request) => {
        const permissions = await plannerRepository.verifyPermissions({
            userId,
            planners: [{ plannerId }],
            status: ["O", "A"],
        });

        if (
            permissions.planners.some(({ hasPermissions }) => !hasPermissions)
        ) {
            throw new NotFoundError("planner", plannerId);
        }

        const { meals } = await plannerRepository.updateMeals({
            plannerId,
            meals: [{ ...request, mealId }],
        });
        const [meal] = meals;
        if (!meal) {
            throw new NotFoundError("planner meal", mealId);
        }

        return meal;
    },
    deleteMeal: async (userId, plannerId, mealId) => {
        const permissions = await plannerRepository.verifyPermissions({
            userId,
            planners: [{ plannerId }],
            status: ["O", "A"],
        });

        if (
            permissions.planners.some(({ hasPermissions }) => !hasPermissions)
        ) {
            throw new NotFoundError("planner", plannerId);
        }

        const { count } = await plannerRepository.deleteMeals({
            plannerId,
            meals: [{ mealId }],
        });

        if (count === 0) {
            throw new NotFoundError("planner meal", mealId);
        }
    },
    getMembers: async (userId, plannerId) => {
        const permissions = await plannerRepository.verifyPermissions({
            userId,
            planners: [{ plannerId }],
            status: "O",
        });

        if (
            permissions.planners.some(({ hasPermissions }) => !hasPermissions)
        ) {
            throw new NotFoundError("planner", plannerId);
        }

        const [plannerMembers] = await plannerRepository.readMembers({
            plannerId,
        });

        if (!plannerMembers) {
            throw new NotFoundError("planner", plannerId);
        }

        const { members } = plannerMembers;

        return members;
    },
    inviteMember: async (userId, plannerId, targetUserId) => {
        const permissions = await plannerRepository.verifyPermissions({
            userId,
            planners: [{ plannerId }],
            status: "O",
        });

        if (
            permissions.planners.some(({ hasPermissions }) => !hasPermissions)
        ) {
            throw new NotFoundError("planner", plannerId);
        }

        const [currentMembers] = await plannerRepository.readMembers({
            plannerId,
        });
        if (currentMembers?.members.some((m) => m.userId === targetUserId)) {
            throw new InvalidOperationError(
                "planner member",
                "User is already a member",
            );
        }

        try {
            await plannerRepository.saveMembers({
                plannerId,
                members: [{ userId: targetUserId, status: "P" }],
            });
        } catch (error: unknown) {
            if (error instanceof ForeignKeyViolationError) {
                throw new NotFoundError("user", targetUserId);
            }
            throw error;
        }
    },
    updateMember: async (userId, plannerId, memberId, status) => {
        const permissions = await plannerRepository.verifyPermissions({
            userId,
            planners: [{ plannerId }],
            status: "O",
        });

        if (
            permissions.planners.some(({ hasPermissions }) => !hasPermissions)
        ) {
            throw new NotFoundError("planner", plannerId);
        }

        const [currentPlannerMembers] = await plannerRepository.readMembers({
            plannerId,
        });
        const currentMember = currentPlannerMembers?.members.find(
            (m) => m.userId === memberId,
        );

        if (!currentMember) {
            throw new NotFoundError("planner member", memberId);
        }

        if (currentMember.status === "P") {
            throw new InvalidOperationError(
                "planner member",
                "Cannot update a pending member",
            );
        }

        await plannerRepository.saveMembers({
            plannerId,
            members: [{ userId: memberId, status }],
        });

        const [plannerMembers] = await plannerRepository.readMembers({
            plannerId,
        });

        const member = plannerMembers?.members.find(
            (m) => m.userId === memberId,
        );

        if (!member) {
            throw new NotFoundError("planner member", memberId);
        }

        return member;
    },
    removeMember: async (userId, plannerId, memberId) => {
        const permissions = await plannerRepository.verifyPermissions({
            userId,
            planners: [{ plannerId }],
            status: "O",
        });

        if (
            permissions.planners.some(({ hasPermissions }) => !hasPermissions)
        ) {
            throw new NotFoundError("planner", plannerId);
        }

        if (memberId === userId) {
            throw new InvalidOperationError(
                "planner member",
                "Cannot remove self from planner",
            );
        }

        await plannerRepository.removeMembers({
            plannerId,
            members: [{ userId: memberId }],
        });
    },
    acceptInvite: async (userId, plannerId) => {
        const permissions = await plannerRepository.verifyPermissions({
            userId,
            planners: [{ plannerId }],
            status: "P",
        });

        if (
            permissions.planners.some(({ hasPermissions }) => !hasPermissions)
        ) {
            throw new NotFoundError("planner", plannerId);
        }

        await plannerRepository.saveMembers({
            plannerId,
            members: [{ userId, status: "M" }],
        });
    },
    declineInvite: async (userId, plannerId) => {
        const permissions = await plannerRepository.verifyPermissions({
            userId,
            planners: [{ plannerId }],
            status: "P",
        });

        if (
            permissions.planners.some(({ hasPermissions }) => !hasPermissions)
        ) {
            throw new NotFoundError("planner", plannerId);
        }

        await plannerRepository.removeMembers({
            plannerId,
            members: [{ userId }],
        });
    },
    leavePlanner: async (userId, plannerId) => {
        const permissions = await plannerRepository.verifyPermissions({
            userId,
            planners: [{ plannerId }],
            status: ["A", "M"],
        });

        if (
            permissions.planners.some(({ hasPermissions }) => !hasPermissions)
        ) {
            throw new NotFoundError("planner", plannerId);
        }

        await plannerRepository.removeMembers({
            plannerId,
            members: [{ userId }],
        });
    },
}));
