import { v4 as Uuid } from "uuid";

import db, { type ListItem, lamington, listItem } from "../database/index.ts";
import { EnsureArray, Undefined } from "../utils/index.ts";
import { type ListItemService } from "./spec/index.ts";

const readListItems: ListItemService["Read"] = async params => {
    const listIds = EnsureArray(params).map(({ listId }) => listId); // TODO verify auth

    return db<ListItem>(lamington.listItem).select("*").whereIn(listItem.listId, listIds);
};

const countOutstandingItems: ListItemService["CountOutstandingItems"] = async params => {
    const listIds = EnsureArray(params).map(({ listId }) => listId);

    return db(lamington.listItem)
        .select(listItem.listId)
        .count<unknown>(listItem.listId, { as: "count" })
        .whereIn(listItem.listId, listIds)
        .andWhere({ [listItem.completed]: false })
        .groupBy(listItem.listId);
};

const getLatestUpdatedTimestamp: ListItemService["ReadLatestUpdatedTimestamp"] = async params => {
    const listIds = EnsureArray(params).map(({ listId }) => listId);

    return db(lamington.listItem)
        .select(listItem.listId)
        .max<unknown>(listItem.updatedAt, { as: "updatedAt" })
        .whereIn(listItem.listId, listIds)
        .groupBy(listItem.listId);
};

const saveListItems: ListItemService["Save"] = async params => {
    const listItems = EnsureArray(params);

    const data: Omit<ListItem, "updatedAt">[] = listItems
        .map(({ itemId = Uuid(), ...params }) => ({ itemId, ...params }))
        .filter(Undefined);

    return db<ListItem>(lamington.listItem)
        .insert(data)
        .onConflict(["itemId", "listId"])
        .merge()
        .returning(["itemId", "listId", "name", "completed", "createdBy"]);
};

const deleteListItems: ListItemService["Delete"] = async params => {
    const listItems = EnsureArray(params).map(({ listId, itemId }) => [listId, itemId]);

    return db<ListItem>(lamington.listItem).whereIn(["listId", "itemId"], listItems).delete();
};

export const ListItemActions: ListItemService = {
    Delete: deleteListItems,
    Read: readListItems,
    Save: saveListItems,
    CountOutstandingItems: countOutstandingItems,
    ReadLatestUpdatedTimestamp: getLatestUpdatedTimestamp,
};
