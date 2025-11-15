import type { ListItemIngredientAmount } from "../../routes/spec/index.ts";
import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

/**
 * ListItem
 */
export type ListItem = {
    itemId: string;
    listId: string;
    name: string;
    completed: boolean;
    ingredientId?: string;
    unit?: string;
    /**
     * TODO proper definition required (similar to customisation)
     * JSON stringified object containing the amount of the ingredient, as type number, fraction
     * or range with its representation explicitly denoted.
     */
    amount?: ListItemIngredientAmount;
    notes?: string;
};

export const listItem: Table<ListItem> = {
    itemId: `${lamington.listItem}.itemId`,
    listId: `${lamington.listItem}.listId`,
    name: `${lamington.listItem}.name`,
    completed: `${lamington.listItem}.completed`,
    ingredientId: `${lamington.listItem}.ingredientId`,
    unit: `${lamington.listItem}.unit`,
    amount: `${lamington.listItem}.amount`,
    notes: `${lamington.listItem}.notes`,
} as const;
