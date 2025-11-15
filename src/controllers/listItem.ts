import { v4 as Uuid } from "uuid";

import db, { type ListItem, lamington, listItem } from "../database/index.ts";
import { EnsureArray, Undefined } from "../utils/index.ts";
import { type ListItemService } from "./spec/index.ts";
import { content, type Content } from "../database/definitions/content.ts";

const readListItems: ListItemService["Read"] = async params => {
    const listIds = EnsureArray(params).map(({ listId }) => listId); // TODO verify auth

    return db<ListItem>(lamington.listItem)
        .select("*", content.createdBy, content.updatedAt)
        .whereIn(listItem.listId, listIds)
        .leftJoin(lamington.content, content.contentId, listItem.itemId);
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
        .max<unknown>(content.updatedAt, { as: "updatedAt" })
        .leftJoin(lamington.content, listItem.itemId, content.contentId)
        .whereIn(listItem.listId, listIds)
        .groupBy(listItem.listId);
};

const saveListItems: ListItemService["Save"] = async params => {
    const listItems = EnsureArray(params);

    const data = listItems.map(({ itemId = Uuid(), ...params }) => ({ itemId, ...params })).filter(Undefined);

    const listItemData: ListItem[] = listItems.map(({ createdBy, ...params }) => params).filter(Undefined);

    // const result = await db.transaction(async trx => {
    await db<Content>(lamington.content)
        .insert(
            data.map(({ itemId, createdBy }) => ({
                contentId: itemId,
                createdBy,
            }))
        )
        .onConflict("contentId")
        .merge();

    const result = await db<ListItem>(lamington.listItem)
        .insert(listItemData)
        .onConflict("itemId") // TODO: can this now overwrite other users items on conflict?
        .merge()
        .returning(["itemId"]);

    return db(lamington.listItem)
        .select("list_item.*", "content.createdBy", "content.createdAt")
        .whereIn(
            "itemId",
            result.map(item => item.itemId)
        )
        .join(lamington.content, listItem.itemId, "content.contentId");
    // });

    // return result;
};

const deleteListItems: ListItemService["Delete"] = async params => {
    const listItems = EnsureArray(params).map(({ listId, itemId }) => itemId);

    return db<Content>(lamington.content).whereIn(content.contentId, listItems).delete();
};

export const ListItemActions: ListItemService = {
    Delete: deleteListItems,
    Read: readListItems,
    Save: saveListItems,
    CountOutstandingItems: countOutstandingItems,
    ReadLatestUpdatedTimestamp: getLatestUpdatedTimestamp,
};
