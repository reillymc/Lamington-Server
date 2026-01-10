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
    customisations: ListCustomisations | null;
    description: string | null;
};

export const listColumns = ["listId", "name", "customisations", "description"] as const satisfies (keyof List)[];

export const list = Object.fromEntries(
    listColumns.map(column => [column, `${lamington.list}.${column}`])
) as Table<List>;
