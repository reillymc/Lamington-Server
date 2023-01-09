import { v4 as Uuid } from "uuid";

import db, {
    CreateResponse,
    ReadResponse,
    lamington,
    ReadQuery,
    CreateQuery,
    ListItem,
    listItem,
    ListItemModel,
    DeleteResponse,
} from "../database";
import { Undefined } from "../utils";

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

interface CreateListItemParams {
    itemId: string | undefined;
    listId: string;
    name: string;
    dateAdded: string;
    completed: boolean;
    ingredientId?: string;
    unit?: string;
    amount?: number;
    notes?: string;
    createdBy: string;
}

/**
 * Creates a new list from params
 * @returns the newly created lists
 */
const saveListItems = async (listItems: CreateQuery<CreateListItemParams>): CreateResponse<ListItem> => {
    if (!Array.isArray(listItems)) {
        listItems = [listItems];
    }
    const data: ListItemModel[] = listItems
        .map(({ itemId, completed, ...params }) => ({
            itemId: itemId ?? Uuid(),
            completed: completed ? 1 : 0,
            ...params,
        }))
        .filter(Undefined);

    const result = await db(lamington.listItem).insert(data).onConflict([listItem.listId, listItem.itemId]).merge();

    const listIds = data.map(({ listId }) => listId);

    const query = db<ListItem>(lamington.listItem).select("*").whereIn(listItem.listId, listIds);
    return query;
};

interface DeleteListItemParams {
    itemId: string;
    listId: string;
}

/**
 * Creates a new list from params
 * @returns the newly created lists
 */
const deleteListItems = async (listItems: CreateQuery<DeleteListItemParams>): DeleteResponse => {
    if (!Array.isArray(listItems)) {
        listItems = [listItems];
    }

    const listIds = listItems.map(({ listId }) => listId);
    const itemIds = listItems.map(({ itemId }) => itemId);

    return db(lamington.listItem).whereIn(listItem.listId, listIds).whereIn(listItem.itemId, itemIds).delete();
};

export const ListItemActions = {
    delete: deleteListItems,
    read: readListItems,
    save: saveListItems,
    countOutstandingItems,
};
