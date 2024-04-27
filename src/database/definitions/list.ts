import { Table } from ".";
import { ListCustomisations } from "../../routes/helpers";
import { lamington } from "./lamington";

/**
 * List
 */
export type List = {
    listId: string;
    name: string;
    createdBy: string;
    // TODO proper customisation definition like others
    customisations?: ListCustomisations;
    description?: string;
};

export const list: Table<List> = {
    listId: `${lamington.list}.listId`,
    name: `${lamington.list}.name`,
    createdBy: `${lamington.list}.createdBy`,
    customisations: `${lamington.list}.customisations`,
    description: `${lamington.list}.description`,
} as const;
