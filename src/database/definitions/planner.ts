import { Table } from ".";
import { lamington } from "./lamington";

/**
 * Planner
 */
export interface Planner {
    plannerId: string;
    createdBy: string;
    name: string;
    variant: string;
    description: string | undefined;
}

export const planner = {
    plannerId: `${lamington.planner}.plannerId`,
    createdBy: `${lamington.planner}.createdBy`,
    name: `${lamington.planner}.name`,
    variant: `${lamington.planner}.variant`,
    description: `${lamington.planner}.description`,
} satisfies Table<Planner>;
