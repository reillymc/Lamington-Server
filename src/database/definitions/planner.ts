import { Table } from ".";
import { lamington } from "./lamington";

/**
 * Planner
 */
export interface Planner {
    plannerId: string;
    createdBy: string;
    name: string;
    customisations?: string;
    description?: string;
}

export const planner = {
    plannerId: `${lamington.planner}.plannerId`,
    createdBy: `${lamington.planner}.createdBy`,
    name: `${lamington.planner}.name`,
    customisations: `${lamington.planner}.customisations`,
    description: `${lamington.planner}.description`,
} satisfies Table<Planner>;
