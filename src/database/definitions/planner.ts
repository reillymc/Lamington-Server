import type { PlannerCustomisations } from "../../routes/helpers/index.ts";
import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

/**
 * Planner
 */
export interface Planner {
    plannerId: string;
    name: string;
    // TODO - customisations model same as book
    customisations?: PlannerCustomisations;
    description?: string;
}

export const planner = {
    plannerId: `${lamington.planner}.plannerId`,
    name: `${lamington.planner}.name`,
    customisations: `${lamington.planner}.customisations`,
    description: `${lamington.planner}.description`,
} satisfies Table<Planner>;
