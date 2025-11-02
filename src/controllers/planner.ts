import db, { type Planner, lamington, planner, plannerMember, user } from "../database/index.ts";
import { EnsureArray } from "../utils/index.ts";
import { PlannerMemberActions } from "./plannerMember.ts";
import { type PlannerService } from "./spec/index.ts";

const readMyPlanners: PlannerService["ReadByUser"] = async ({ userId }) => {
    const query = db<Planner>(lamington.planner)
        .select(
            planner.plannerId,
            planner.name,
            planner.customisations,
            planner.description,
            planner.createdBy,
            `${user.firstName} as createdByName`,
            plannerMember.status
        )
        .where({ [planner.createdBy]: userId })
        .orWhere({ [plannerMember.userId]: userId })
        .leftJoin(lamington.user, planner.createdBy, user.userId)
        .leftJoin(lamington.plannerMember, planner.plannerId, plannerMember.plannerId);

    return query;
};

const readPlanners: PlannerService["Read"] = async params => {
    const requests = EnsureArray(params);
    const response = [];

    // TODO move to single query
    for (const { plannerId, userId } of requests) {
        const result = await db<Planner>(lamington.planner)
            .select(
                planner.plannerId,
                "name",
                "customisations",
                "description",
                "createdBy",
                `${user.firstName} as createdByName`,
                plannerMember.status
            )
            .whereIn(
                planner.plannerId,
                db<string[]>(lamington.plannerMember)
                    .select(plannerMember.plannerId)
                    .where({ [plannerMember.userId]: userId, [plannerMember.plannerId]: plannerId })
            )
            .orWhere({ [planner.createdBy]: userId, [planner.plannerId]: plannerId })
            .leftJoin(lamington.user, planner.createdBy, user.userId)
            .leftJoin(lamington.plannerMember, planner.plannerId, plannerMember.plannerId)
            .first();

        if (result) response.push(result);
    }

    return response;
};

const savePlanners: PlannerService["Save"] = async params => {
    const planners = EnsureArray(params);

    const plannerData: Planner[] = planners.map(({ members, ...plannerItem }) => plannerItem);

    const result = await db<Planner>(lamington.planner)
        .insert(plannerData)
        .onConflict("plannerId")
        .merge()
        .returning(["plannerId", "name", "customisations", "description", "createdBy"]);

    if (planners.length > 0) await PlannerMemberActions.save(planners, { trimNotIn: true });

    return result;
};

const deletePlanners: PlannerService["Delete"] = async params => {
    const plannerIds = EnsureArray(params).map(({ plannerId }) => plannerId);

    return db(lamington.planner).whereIn(planner.plannerId, plannerIds).delete();
};

const readPermissions: PlannerService["ReadPermissions"] = async params => {
    const planners = EnsureArray(params);
    const plannersItems = planners.map(({ plannerId, userId }) => [plannerId, userId]);

    if (!plannersItems.length) return [];

    return db<Planner>(lamington.planner)
        .select(planner.plannerId, planner.createdBy, plannerMember.status)
        .whereIn(
            planner.plannerId,
            planners.map(({ plannerId }) => plannerId)
        )
        .leftJoin(lamington.plannerMember, builder => {
            builder.on(planner.plannerId, "=", plannerMember.plannerId).andOnIn(
                plannerMember.userId,
                planners.map(({ userId }) => userId)
            );
        });
};
export const PlannerActions: PlannerService = {
    Save: savePlanners,
    Delete: deletePlanners,
    Read: readPlanners,
    ReadByUser: readMyPlanners,
    ReadPermissions: readPermissions,
};
