import { lamington, Table } from ".";

/**
 * ListItem
 */
export type ListItem = {
    itemId: string;
    listId: string;
    name: string;
    dateAdded: string;
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
    dateAdded: string;
    completed: number; // 0 | 1
    ingredientId?: string;
    unit?: string;
    amount?: number;
    notes?: string;
};

export const listItem: Table<ListItem> = {
    itemId: `${lamington.listItem}.itemId`,
    listId: `${lamington.listItem}.listId`,
    // index : `${lamington.listItem}.index`,
    name: `${lamington.listItem}.name`,
    dateAdded: `${lamington.listItem}.dateAdded`,
    completed: `${lamington.listItem}.completed`,
    ingredientId: `${lamington.listItem}.ingredientId`,
    unit: `${lamington.listItem}.unit`,
    amount: `${lamington.listItem}.amount`,
    notes: `${lamington.listItem}.notes`,
    createdBy: `${lamington.listItem}.createdBy`,
} as const;
