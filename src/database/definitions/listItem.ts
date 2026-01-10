import type { Table } from "./index.ts";
import { lamington } from "./lamington.ts";

export type NumberValue = { representation: "number"; value: string };
export type RangeValue = { representation: "range"; value: [string, string] };
export type FractionValue = { representation: "fraction"; value: [string, string, string] };

type ListItemIngredientAmountV1 = RangeValue | NumberValue | FractionValue;

export type ListItemIngredientAmount = ListItemIngredientAmountV1;

/**
 * ListItem
 */
export interface ListItem {
    itemId: string;
    listId: string;
    name: string;
    completed: boolean;
    ingredientId: string | null;
    unit: string | null;
    amount: ListItemIngredientAmount | null;
    notes: string | null;
}

export const listItemColumns = [
    "itemId",
    "listId",
    "name",
    "completed",
    "ingredientId",
    "unit",
    "amount",
    "notes",
] as const satisfies (keyof ListItem)[];

export const listItem = Object.fromEntries(
    listItemColumns.map(column => [column, `${lamington.listItem}.${column}`])
) as Table<ListItem>;
