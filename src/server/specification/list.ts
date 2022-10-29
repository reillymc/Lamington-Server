/**
 * Lists
 */
export type Lists = {
    [listId: string]: List;
};

/**
 * List
 */
export type List = {
    listId: string;
    name: string;
    createdBy: string;
    description: string | undefined;
    items?: Array<ListItem>;
};

/**
 * ListItem
 */
export type ListItem = {
    itemId: string;
    name: string;
    dateAdded: string;
    completed: boolean;
    ingredientId?: string;
    unit?: string;
    amount?: number;
    notes?: string;
};
