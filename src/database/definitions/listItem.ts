import { Table } from ".";
import { ListItemIngredientAmount } from "../../routes/spec";
import { lamington } from "./lamington";

/**
 * ListItem
 */
export type ListItem = {
    itemId: string;
    listId: string;
    name: string;
    updatedAt: string;
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
    createdBy: string;
};

export const listItem: Table<ListItem> = {
    itemId: `${lamington.listItem}.itemId`,
    listId: `${lamington.listItem}.listId`,
    name: `${lamington.listItem}.name`,
    updatedAt: `${lamington.listItem}.updatedAt`,
    completed: `${lamington.listItem}.completed`,
    ingredientId: `${lamington.listItem}.ingredientId`,
    unit: `${lamington.listItem}.unit`,
    amount: `${lamington.listItem}.amount`,
    notes: `${lamington.listItem}.notes`,
    createdBy: `${lamington.listItem}.createdBy`,
} as const;
