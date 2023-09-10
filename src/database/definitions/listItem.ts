import { Table } from ".";
import { lamington } from "./lamington";

/**
 * ListItem
 */
export type ListItem = {
    itemId: string;
    listId: string;
    name: string;
    dateUpdated: string;
    completed: boolean;
    ingredientId?: string;
    unit?: string;
    amount?: number;
    notes?: string;
    createdBy: string;
};

export type ListItemModel = {
    itemId: string;
    listId: string;
    name: string;
    dateUpdated?: string;
    completed: number; // 0 | 1
    ingredientId?: string;
    unit?: string;
    amount?: number;
    notes?: string;
};

export const listItem: Table<ListItem> = {
    itemId: `${lamington.listItem}.itemId`,
    listId: `${lamington.listItem}.listId`,
    name: `${lamington.listItem}.name`,
    dateUpdated: `${lamington.listItem}.dateUpdated`,
    completed: `${lamington.listItem}.completed`,
    ingredientId: `${lamington.listItem}.ingredientId`,
    unit: `${lamington.listItem}.unit`,
    amount: `${lamington.listItem}.amount`,
    notes: `${lamington.listItem}.notes`,
    createdBy: `${lamington.listItem}.createdBy`,
} as const;
