import type { components } from "../routes/spec/index.ts";
import { CreatedDataFetchError, NotFoundError, UpdatedDataFetchError } from "./logging.ts";
import { type CreateService } from "./service.ts";

export interface PlannerService {
    getAll: (userId: string) => Promise<components["schemas"]["Planner"][]>;
    get: (userId: string, plannerId: string) => Promise<components["schemas"]["Planner"]>;
    create: (
        userId: string,
        request: components["schemas"]["PlannerCreate"]
    ) => Promise<components["schemas"]["Planner"]>;
    update: (
        userId: string,
        plannerId: string,
        request: components["schemas"]["PlannerUpdate"]
    ) => Promise<components["schemas"]["Planner"]>;
    delete: (userId: string, plannerId: string) => Promise<void>;
    getMeals: (
        userId: string,
        plannerId: string,
        year: number,
        month: number
    ) => Promise<components["schemas"]["PlannerMeal"][]>;
    createMeals: (
        userId: string,
        plannerId: string,
        meals: components["schemas"]["PlannerMealCreate"][]
    ) => Promise<components["schemas"]["PlannerMeal"][]>;
    updateMeal: (
        userId: string,
        plannerId: string,
        mealId: string,
        meal: components["schemas"]["PlannerMealUpdate"]
    ) => Promise<components["schemas"]["PlannerMeal"]>;
    deleteMeal: (userId: string, plannerId: string, mealId: string) => Promise<void>;
    joinMembership: (userId: string, plannerId: string) => Promise<void>;
    leaveMembership: (userId: string, plannerId: string, memberId?: string) => Promise<void>;
}

export const createPlannerService: CreateService<PlannerService, "plannerRepository"> = (
    database,
    { plannerRepository }
) => ({
    getAll: async userId => {
        const { planners } = await plannerRepository.readAll(database, { userId });
        return planners;
    },
    get: async (userId, plannerId) => {
        const {
            planners: [planner],
        } = await plannerRepository.read(database, { userId, planners: [{ plannerId }] });

        if (!planner) {
            throw new NotFoundError("planner", plannerId);
        }

        return planner;
    },
    create: (userId, request) =>
        database.transaction(async trx => {
            const { planners } = await plannerRepository.create(trx, { userId, planners: [request] });

            const [planner] = planners;

            if (!planner) {
                throw new CreatedDataFetchError("planner");
            }

            return planner;
        }),
    update: (userId, plannerId, request) =>
        database.transaction(async trx => {
            const permissions = await plannerRepository.verifyPermissions(trx, {
                userId,
                planners: [{ plannerId }],
                status: "O",
            });

            if (permissions.planners.some(({ hasPermissions }: any) => !hasPermissions)) {
                throw new NotFoundError("planner", plannerId);
            }

            const { planners } = await plannerRepository.update(trx, {
                userId,
                planners: [{ ...request, plannerId }],
            });

            const [planner] = planners;
            if (!planner) {
                throw new UpdatedDataFetchError("planner", plannerId);
            }
            return planner;
        }),
    delete: (userId, plannerId) =>
        database.transaction(async trx => {
            const permissions = await plannerRepository.verifyPermissions(trx, {
                userId,
                planners: [{ plannerId }],
                status: "O",
            });

            if (permissions.planners.some(({ hasPermissions }) => !hasPermissions)) {
                throw new NotFoundError("planner", plannerId);
            }

            await plannerRepository.delete(trx, { planners: [{ plannerId }] });
        }),
    createMeals: (userId, plannerId, meals) =>
        database.transaction(async trx => {
            const permissions = await plannerRepository.verifyPermissions(trx, {
                userId,
                planners: [{ plannerId }],
                status: "A",
            });

            if (permissions.planners.some(({ hasPermissions }) => !hasPermissions)) {
                throw new NotFoundError("planner", plannerId);
            }

            const { meals: createdMeals } = await plannerRepository.createMeals(trx, {
                userId,
                meals: meals.map(meal => ({ ...meal, plannerId })),
            });
            return createdMeals;
        }),
    getMeals: async (userId, plannerId, year, month) => {
        const permissions = await plannerRepository.verifyPermissions(database, {
            userId,
            planners: [{ plannerId }],
            status: "A",
        });

        if (permissions.planners.some(({ hasPermissions }) => !hasPermissions)) {
            throw new NotFoundError("planner", plannerId);
        }

        const { meals } = await plannerRepository.readAllMeals(database, {
            userId,
            filter: {
                plannerId,
                month,
                year,
            },
        });
        return meals;
    },
    updateMeal: (userId, plannerId, mealId, request) =>
        database.transaction(async trx => {
            const permissions = await plannerRepository.verifyPermissions(trx, {
                userId,
                planners: [{ plannerId }],
                status: "A",
            });

            if (permissions.planners.some(({ hasPermissions }) => !hasPermissions)) {
                throw new NotFoundError("planner", plannerId);
            }

            const { meals } = await plannerRepository.updateMeals(trx, { meals: [{ ...request, mealId }] });
            const [meal] = meals;
            if (!meal) {
                throw new UpdatedDataFetchError("planner meal", mealId);
            }

            return meal;
        }),
    deleteMeal: (userId, plannerId, mealId) =>
        database.transaction(async trx => {
            const permissions = await plannerRepository.verifyPermissions(trx, {
                userId,
                planners: [{ plannerId }],
                status: "A",
            });

            if (permissions.planners.some(({ hasPermissions }) => !hasPermissions)) {
                throw new NotFoundError("planner", plannerId);
            }

            await plannerRepository.deleteMeals(trx, { meals: [{ mealId }] });
        }),
    joinMembership: (userId, plannerId) =>
        database.transaction(async trx => {
            const permissions = await plannerRepository.verifyPermissions(trx, {
                userId,
                planners: [{ plannerId }],
                status: "P",
            });

            if (permissions.planners.some(({ hasPermissions }) => !hasPermissions)) {
                throw new NotFoundError("planner", plannerId);
            }

            await plannerRepository.saveMembers(trx, {
                plannerId,
                members: [{ userId, status: "M" }],
            });
        }),
    leaveMembership: (userId, plannerId, memberId) =>
        database.transaction(async trx => {
            const targetId = memberId || userId;
            const removingSelf = targetId === userId;

            if (removingSelf) {
                const permissions = await plannerRepository.verifyPermissions(trx, {
                    userId,
                    planners: [{ plannerId }],
                    status: ["A", "M"],
                });
                if (permissions.planners.some(({ hasPermissions }) => !hasPermissions)) {
                    throw new NotFoundError("planner", plannerId);
                }
            } else {
                const permissions = await plannerRepository.verifyPermissions(trx, {
                    userId,
                    planners: [{ plannerId }],
                    status: "O",
                });
                if (permissions.planners.some(({ hasPermissions }) => !hasPermissions)) {
                    throw new NotFoundError("planner", plannerId);
                }
            }

            await plannerRepository.removeMembers(trx, { plannerId, members: [{ userId: targetId }] });
        }),
});
