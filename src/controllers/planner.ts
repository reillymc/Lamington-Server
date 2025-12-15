import { content, type Content } from "../database/definitions/content.ts";
import { contentMember } from "../database/definitions/contentMember.ts";
import db, { type Planner, lamington, planner, user } from "../database/index.ts";
import { EnsureArray } from "../utils/index.ts";
import { PlannerMemberActions } from "./plannerMember.ts";
import { type PlannerService } from "./spec/index.ts";

const readMyPlanners: PlannerService["ReadByUser"] = async ({ userId }) => {
    const query = db(lamington.planner)
        .select(
            planner.plannerId,
            planner.name,
            planner.customisations,
            planner.description,
            content.createdBy,
            `${user.firstName} as createdByName`,
            contentMember.status
        )
        .where({ [content.createdBy]: userId })
        .orWhere({ [contentMember.userId]: userId })
        .leftJoin(lamington.content, planner.plannerId, content.contentId)
        .leftJoin(lamington.user, content.createdBy, user.userId)
        .leftJoin(lamington.contentMember, planner.plannerId, contentMember.contentId);

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
                content.createdBy,
                `${user.firstName} as createdByName`,
                contentMember.status
            )
            .whereIn(
                planner.plannerId,
                db(lamington.contentMember)
                    .select(contentMember.contentId)
                    .where({ [contentMember.userId]: userId, [contentMember.contentId]: plannerId })
            )
            .orWhere({ [content.createdBy]: userId, [planner.plannerId]: plannerId })
            .leftJoin(lamington.content, content.contentId, planner.plannerId)
            .leftJoin(lamington.user, content.createdBy, user.userId)
            .leftJoin(lamington.contentMember, planner.plannerId, contentMember.contentId)
            .first();

        if (result) response.push(result);
    }

    return response;
};

const savePlanners: PlannerService["Save"] = async params => {
    const planners = EnsureArray(params);

    // const result = await db.transaction(async trx => {
    await db<Content>(lamington.content)
        .insert(
            planners.map(({ plannerId, createdBy }) => ({
                contentId: plannerId,
                createdBy,
            }))
        )
        .onConflict("contentId")
        .merge();

    const result = await db<Planner>(lamington.planner)
        .insert(
            planners.map(({ name, plannerId, customisations, description }) => ({
                name,
                plannerId,
                customisations,
                description,
            }))
        )
        .onConflict("plannerId")
        .merge()
        .returning(["plannerId", "name", "customisations", "description"]);

    const savedPlanners = await db(lamington.planner)
        .select("planner.*", "content.createdBy", "content.createdAt")
        .whereIn(
            "plannerId",
            result.map(planner => planner.plannerId)
        )
        .join(lamington.content, "planner.plannerId", "content.contentId");
    // });

    if (result.length > 0) await PlannerMemberActions.save(planners, { trimNotIn: true });

    return savedPlanners;
};

const deletePlanners: PlannerService["Delete"] = async params => {
    const plannerIds = EnsureArray(params).map(({ plannerId }) => plannerId);

    return db(lamington.content).whereIn(content.contentId, plannerIds).delete();
};

const readPermissions: PlannerService["ReadPermissions"] = async params => {
    const planners = EnsureArray(params);
    const plannersItems = planners.map(({ plannerId, userId }) => [plannerId, userId]);

    if (!plannersItems.length) return [];

    return db<Planner>(lamington.planner)
        .select(planner.plannerId, content.createdBy, contentMember.status)
        .whereIn(
            planner.plannerId,
            planners.map(({ plannerId }) => plannerId)
        )
        .leftJoin(lamington.content, planner.plannerId, content.contentId)
        .leftJoin(lamington.contentMember, builder => {
            builder.on(planner.plannerId, "=", contentMember.contentId).andOnIn(
                contentMember.userId,
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
