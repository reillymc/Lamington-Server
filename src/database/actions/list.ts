import { v4 as Uuid } from "uuid";

import db from "../config";
import {
    CreateResponse,
    ReadResponse,
    list,
    lamington,
    ReadQuery,
    CreateQuery,
    listMember,
    user,
    ListItem,
    listItem,
    ListMember,
    List,
    ListItemModel,
} from "../definitions";
import { Undefined } from "../helpers";

/**
 * Get all lists
 * @returns an array of all lists in the database
 */
const readAllLists = async (): ReadResponse<List> => {
    const query = db<List>(lamington.list).select("*");
    return query;
};

export interface GetMyListsParams {
    userId: string;
}

/**
 * Get all lists
 * @returns an array of all lists in the database
 */
export const readMyLists = async ({ userId }: GetMyListsParams): ReadResponse<List> => {
    const query = db<List>(lamington.list)
        .select(list.listId, list.name, list.description, list.createdBy)
        .whereIn(
            list.listId,
            db<string[]>(lamington.listMember)
                .select(listMember.listId)
                .where({ [listMember.userId]: userId })
        )
        .orWhere({ [list.createdBy]: userId });

    return query;
};

export interface GetListParams {
    listId: string;
    userId: string;
}

/**
 * Get lists by id or ids
 * @returns an array of lists matching given ids
 */
export const readLists = async ({ listId, userId }: GetListParams): ReadResponse<List> => {
    // if (!Array.isArray(params)) {
    //     params = [params];
    // }
    // const listIds = params.map(({ listId }) => listId);

    const query = db<List>(lamington.list)
        .select(list.listId, list.name, list.description, `${user.firstName} as createdBy`)
        .whereIn(
            list.listId,
            db<string[]>(lamington.listMember)
                .select(listMember.listId)
                .where({ [listMember.userId]: userId, [listMember.listId]: listId })
        )
        .orWhere({ [list.createdBy]: userId, [list.listId]: listId })
        .leftJoin(lamington.user, list.createdBy, user.userId);

    return query;
};

export interface GetListItemsParams {
    listId: string;
}

/**
 * Get lists by id or ids
 * @returns an array of lists matching given ids
 */
export const readListItems = async (params: ReadQuery<GetListItemsParams>): ReadResponse<ListItem> => {
    if (!Array.isArray(params)) {
        params = [params];
    }
    const listIds = params.map(({ listId }) => listId); // TODO verify auth

    const query = db<ListItem>(lamington.listItem).select("*").whereIn(listItem.listId, listIds);
    return query;
};

export interface GetListAuthParams {
    listId: string;
}

/**
 * Get list authorisation
 * @param listId
 * @returns
 */
export const getListMembers = async ({
    listId,
}: GetListAuthParams): Promise<[{ userId: string; canEdit: number }] | undefined> => {
    const query = db<ListMember>(lamington.listMember)
        .select(listMember.userId, listMember.canEdit)
        .where({ [listMember.listId]: listId });

    return query as any;
};

export interface CreateListParams {
    listId?: string;
    description: string | undefined;
    name: string;
    createdBy: string;
    members?: string[];
}

/**
 * Creates a new list from params
 * @returns the newly created lists
 */
const createLists = async (lists: CreateQuery<CreateListParams>): CreateResponse<List> => {
    if (!Array.isArray(lists)) {
        lists = [lists];
    }
    const data = lists.map(({ listId, ...params }) => ({ listId: listId ?? Uuid(), ...params })).filter(Undefined);

    const listData: List[] = data.map(({ members, ...listItem }) => listItem);
    const memberData: ListMember[] = data.flatMap(
        ({ listId, members }) => members?.map(userId => ({ listId, userId, canEdit: "1" })) ?? []
    );

    const result = await db(lamington.list).insert(listData).onConflict(list.listId).merge();
    const result2 = await db(lamington.listMember)
        .insert(memberData)
        .onConflict([listMember.listId, listMember.userId])
        .merge();

    const listIds = data.map(({ listId }) => listId);

    const query = db<List>(lamington.list).select("*").whereIn(list.listId, listIds);
    return query;
};

export interface CreateListItemParams {
    itemId: string | undefined;
    listId: string;
    name: string;
    dateAdded: string;
    completed: boolean;
    ingredientId?: string;
    unit?: string;
    amount?: number;
    notes?: string;
}

/**
 * Creates a new list from params
 * @returns the newly created lists
 */
export const createListItems = async (listItems: CreateQuery<CreateListItemParams>): CreateResponse<ListItem> => {
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

export interface DeleteListItemParams {
    itemId: string;
    listId: string;
}

/**
 * Creates a new list from params
 * @returns the newly created lists
 */
export const deleteListItems = async (listItems: CreateQuery<DeleteListItemParams>): CreateResponse<ListItem> => {
    if (!Array.isArray(listItems)) {
        listItems = [listItems];
    }

    const listIds = listItems.map(({ listId }) => listId);
    const itemIds = listItems.map(({ itemId }) => itemId);

    return db(lamington.listItem).whereIn(listItem.listId, listIds).whereIn(listItem.itemId, itemIds).delete();
};

const ListActions = {
    readLists,
    readAllLists,
    createLists,
    readListItems,
    // deleteLists,
};

export default ListActions;

export { readAllLists, createLists };

export interface ReadListInternalParams {
    listId: string;
    userId?: string;
}

/**
 * Get lists by id or ids
 * @returns an array of lists matching given ids
 */
export const readListsInternal = async (params: ReadQuery<ReadListInternalParams>): ReadResponse<List> => {
    if (!Array.isArray(params)) {
        params = [params];
    }
    const query = db<List>(lamington.list).select(list.listId, list.name, list.description, list.createdBy);
    return query;
};

const InternalListActions = {
    readLists: readListsInternal,
};

export { InternalListActions };
