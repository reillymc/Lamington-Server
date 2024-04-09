import { Table } from ".";
import { EntityMember } from "./entity";
import { lamington } from "./lamington";

/**
 * Planner
 */
export type PlannerMember = EntityMember<{ plannerId: string }>;

export const plannerMember: Table<PlannerMember> = {
    plannerId: `${lamington.plannerMember}.plannerId`,
    userId: `${lamington.plannerMember}.userId`,
    status: `${lamington.plannerMember}.status`,
} as const;
