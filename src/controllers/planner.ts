import db, {
    CreateQuery,
    CreateResponse,
    DeleteResponse,
    Planner,
    PlannerMember,
    ReadQuery,
    ReadResponse,
    User,
    lamington,
    planner,
    plannerMember,
    user,
} from "../database";
import { EnsureArray } from "../utils";
import { EntityMember } from "./entity";
import { PlannerMemberActions } from "./plannerMember";

/**
 * Get all planners
 * @returns an array of all planners in the database
 */
const readAllPlanners = async (): ReadResponse<Planner> => {
    const query = db<Planner>(lamington.planner).select(
        planner.plannerId,
        planner.name,
        planner.description,
        planner.createdBy
    );
    return query;
};

interface GetMyPlannersParams {
    userId: string;
}

interface ReadPlannerRow extends Pick<Planner, "plannerId" | "name" | "customisations" | "createdBy" | "description"> {
    createdByName: User["firstName"];
    status: PlannerMember["status"];
}

/**
 * Get all planners from a user
 * @returns an array of all planners created by given user
 */
const readMyPlanners = async ({ userId }: GetMyPlannersParams): ReadResponse<ReadPlannerRow> => {
    const query = db<ReadPlannerRow>(lamington.planner)
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

interface GetPlannerParams {
    plannerId: string;
    userId: string;
}

/**
 * Get planners by id or ids
 * @returns an array of planners matching given ids
 */
const readPlanners = async ({ plannerId, userId }: GetPlannerParams): ReadResponse<ReadPlannerRow> => {
    const query = db<ReadPlannerRow>(lamington.planner)
        .select(
            planner.plannerId,
            planner.name,
            planner.customisations,
            planner.description,
            planner.createdBy,
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
        .leftJoin(lamington.plannerMember, planner.plannerId, plannerMember.plannerId);

    return query;
};

/**
 * Creates a new planner from params
 * @returns the newly created planners
 */
const savePlanners = async (
    params: CreateQuery<Planner & { members?: Array<EntityMember> }>
): CreateResponse<Planner> => {
    const planners = EnsureArray(params);

    const plannerIds = planners.map(({ plannerId }) => plannerId);

    const plannerData: Planner[] = planners.map(({ members, ...plannerItem }) => plannerItem);

    const result = await db(lamington.planner).insert(plannerData).onConflict(planner.plannerId).merge();

    if (planners.length > 0) await PlannerMemberActions.save(planners, { trimNotIn: true });

    return db<Planner>(lamington.planner)
        .select(planner.plannerId, planner.name, planner.customisations, planner.description, planner.createdBy)
        .whereIn(planner.plannerId, plannerIds);
};

interface DeletePlannerParams {
    plannerId: string;
}

/**
 * Deletes planners by planner ids
 */
const deletePlanners = async (planners: CreateQuery<DeletePlannerParams>): DeleteResponse => {
    if (!Array.isArray(planners)) {
        planners = [planners];
    }

    const plannerIds = planners.map(({ plannerId }) => plannerId);

    return db(lamington.planner).whereIn(planner.plannerId, plannerIds).delete();
};

interface ReadPlannerInternalParams {
    plannerId: string;
}

/**
 * Get planner by id or ids
 * @returns an array of planner matching given ids
 */
const readPlannersInternal = async (params: ReadQuery<ReadPlannerInternalParams>): ReadResponse<Planner> => {
    if (!Array.isArray(params)) {
        params = [params];
    }

    const plannerIds = params.map(({ plannerId }) => plannerId);

    const query = db<Planner>(lamington.planner)
        .select(planner.plannerId, planner.name, planner.customisations, planner.description, planner.createdBy)
        .whereIn(planner.plannerId, plannerIds);
    return query;
};

export const PlannerActions = {
    save: savePlanners,
    delete: deletePlanners,
    read: readPlanners,
    readMy: readMyPlanners,
};

export type PlannerActions = typeof PlannerActions;

export const InternalPlannerActions = {
    read: readPlannersInternal,
};
