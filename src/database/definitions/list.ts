import { Table } from ".";
import { lamington } from "./lamington";

/**
 * List
 */
export type List = {
    listId: string;
    name: string;
    createdBy: string;
    customisations?: string;
    description?: string;
};

export const list: Table<List> = {
    listId: `${lamington.list}.listId`,
    name: `${lamington.list}.name`,
    createdBy: `${lamington.list}.createdBy`,
    customisations: `${lamington.list}.customisations`,
    description: `${lamington.list}.description`,
} as const;
