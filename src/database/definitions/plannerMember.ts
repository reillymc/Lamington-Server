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
    accepted: `${lamington.plannerMember}.accepted`,
    canEdit: `${lamington.plannerMember}.canEdit`,
} as const;
