import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

type ListCustomisationsV1 = {
    icon: string;
};

export type ListCustomisations = ListCustomisationsV1;

/**
 * List
 */
export type List = {
    listId: string;
    name: string;
    // TODO proper customisation definition like others
    customisations?: ListCustomisations;
    description?: string;
};

export const list: Table<List> = {
    listId: `${lamington.list}.listId`,
    name: `${lamington.list}.name`,
    customisations: `${lamington.list}.customisations`,
    description: `${lamington.list}.description`,
} as const;
