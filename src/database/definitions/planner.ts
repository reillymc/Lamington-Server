import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

type PlannerCustomisationsV1 = {
    color: string;
};

export type PlannerCustomisations = PlannerCustomisationsV1;

/**
 * Planner
 */
export interface Planner {
    plannerId: string;
    name: string;
    customisations: PlannerCustomisations | null;
    description: string | null;
}

export const plannerColumns = [
    "plannerId",
    "name",
    "customisations",
    "description",
] as const satisfies (keyof Planner)[];

export const planner = Object.fromEntries(
    plannerColumns.map(column => [column, `${lamington.planner}.${column}`])
) as Table<Planner>;
