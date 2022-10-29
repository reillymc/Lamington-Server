import { lamington, Table } from "./lamington";

/**
 * List
 */
export type List = {
    listId: string;
    name: string;
    createdBy: string;
    description: string | undefined;
};

export const list: Table<List> = {
    listId: `${lamington.list}.listId`,
    name: `${lamington.list}.name`,
    createdBy: `${lamington.list}.createdBy`,
    description: `${lamington.list}.description`,
} as const;
