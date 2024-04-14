import { v4 as Uuid } from "uuid";

import db, {
    CreateQuery,
    DeleteResponse,
    ListItem,
    ListItemModel,
    ReadQuery,
    ReadResponse,
    SaveService,
    lamington,
    listItem,
} from "../database";
import { EnsureArray, Undefined } from "../utils";

interface GetListItemsParams {
    listId: string;
}

/**
 * Get lists by id or ids
 * @returns an array of lists matching given ids
 */
const readListItems = async (params: ReadQuery<GetListItemsParams>): ReadResponse<ListItem> => {
    if (!Array.isArray(params)) {
        params = [params];
    }
    const listIds = params.map(({ listId }) => listId); // TODO verify auth

    const query = db<ListItem>(lamington.listItem).select("*").whereIn(listItem.listId, listIds);
    return query;
};

interface CountListItemsParams {
    listId: string;
}

interface CountListItemsResponse {
    listId: string;
    count: number;
}

/**
 * Get outstanding item count for list
 * @returns count of items not marked as completed
 */
const countOutstandingItems = async (params: ReadQuery<CountListItemsParams>): ReadResponse<CountListItemsResponse> => {
    if (!Array.isArray(params)) {
        params = [params];
    }
    const listIds = params.map(({ listId }) => listId);

    const query = db(lamington.listItem)
        .select(listItem.listId)
        .count<CountListItemsResponse[]>(listItem.listId, { as: "count" })
        .whereIn(listItem.listId, listIds)
        .andWhere({ [listItem.completed]: false })
        .groupBy(listItem.listId);
    return query;
};

interface GetMostRecentModifiedDateParams {
    listId: string;
}

interface GetMostRecentModifiedDateResponse {
    listId: string;
    updatedAt: string;
}

/**
 * Get most recent modified timestamp for list by querying its items and returning the timestamp of the most recently modified item
 * @returns most recent modified timestamp for list
 */
const getLatestUpdatedTimestamp = async (
    params: ReadQuery<GetMostRecentModifiedDateParams>
): ReadResponse<GetMostRecentModifiedDateResponse> => {
    if (!Array.isArray(params)) {
        params = [params];
    }
    const listIds = params.map(({ listId }) => listId);

    const query = db(lamington.listItem)
        .select(listItem.listId)
        .max<GetMostRecentModifiedDateResponse[]>(listItem.updatedAt, { as: "updatedAt" })
        .whereIn(listItem.listId, listIds)
        .groupBy(listItem.listId);
    return query;
};

interface CreateListItemParams {
    itemId: string;
    listId: string;
    name: string;
    completed: boolean;
    ingredientId?: string;
    unit?: string;
    amount?: string;
    notes?: string;
    createdBy: string;
}

/**
 * Creates new list items from params
 * @returns the newly created list items
 */
const saveListItems: SaveService<CreateListItemParams> = async params => {
    const listItems = EnsureArray(params);

    const data: ListItemModel[] = listItems
        .map(({ itemId = Uuid(), ...params }) => ({ itemId, ...params }))
        .filter(Undefined);

    return db<ListItem>(lamington.listItem)
        .insert(data)
        .onConflict(["itemId", "listId"])
        .merge()
        .returning(["itemId", "listId", "name", "completed", "createdBy"]);
};

interface DeleteListItemParams {
    itemId: string;
    listId: string;
}

/**
 * Creates a new list from params
 * @returns the newly created lists
 */
const deleteListItems = async (params: CreateQuery<DeleteListItemParams>): DeleteResponse => {
    const listItems = EnsureArray(params).map(({ listId, itemId }) => [listId, itemId]);

    return db<ListItem>(lamington.listItem).whereIn(["listId", "itemId"], listItems).delete();
};

export const ListItemActions = {
    delete: deleteListItems,
    read: readListItems,
    save: saveListItems,
    countOutstandingItems,
    getLatestUpdatedTimestamp,
};

export type ListItemActions = typeof ListItemActions;
