import type { EntityMember } from "./entity/index.ts";
import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

/**
 * Planner
 */
export type PlannerMember = EntityMember<{ plannerId: string }>;

export const plannerMember: Table<PlannerMember> = {
    plannerId: `${lamington.plannerMember}.plannerId`,
    userId: `${lamington.plannerMember}.userId`,
    status: `${lamington.plannerMember}.status`,
} as const;
