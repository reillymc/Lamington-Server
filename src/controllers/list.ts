import { v4 as Uuid } from "uuid";

import db, {
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
    DeleteResponse,
    User,
} from "../database";
import { Undefined } from "../utils";

/**
 * Get all lists
 * @returns an array of all lists in the database
 */
const readAllLists = async (): ReadResponse<List> => {
    const query = db<List>(lamington.list).select("*");
    return query;
};

interface GetMyListsParams {
    userId: string;
}

interface ReadListRow extends Pick<List, "listId" | "name" | "description"> {
    createdBy: User["userId"];
    createdByName: User["firstName"];
}

/**
 * Get all lists
 * @returns an array of all lists in the database
 */
const readMyLists = async ({ userId }: GetMyListsParams): ReadResponse<ReadListRow> => {
    const query = db<ReadListRow>(lamington.list)
        .select(list.listId, list.name, list.description, list.createdBy, `${user.firstName} as createdByName`)
        .whereIn(
            list.listId,
            db<string[]>(lamington.listMember)
                .select(listMember.listId)
                .where({ [listMember.userId]: userId })
        )
        .orWhere({ [list.createdBy]: userId })
        .leftJoin(lamington.user, list.createdBy, user.userId);

    return query;
};

interface GetListParams {
    listId: string;
    userId: string;
}

/**
 * Get lists by id or ids
 * @returns an array of lists matching given ids
 */
const readLists = async ({ listId, userId }: GetListParams): ReadResponse<ReadListRow> => {
    // if (!Array.isArray(params)) {
    //     params = [params];
    // }
    // const listIds = params.map(({ listId }) => listId);

    const query = db<ReadListRow>(lamington.list)
        .select(list.listId, list.name, list.description, list.createdBy, `${user.firstName} as createdByName`)
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

interface GetListAuthParams {
    listId: string;
}

/**
 * Get list authorisation
 * @param listId
 * @returns
 */
const getListMembers = async ({
    listId,
}: GetListAuthParams): Promise<[{ userId: string; canEdit: number }] | undefined> => {
    const query = db<ListMember>(lamington.listMember)
        .select(listMember.userId, listMember.canEdit)
        .where({ [listMember.listId]: listId });

    return query as any;
};

interface CreateListParams {
    listId?: string;
    description: string | undefined;
    name: string;
    createdBy: string;
    memberIds?: string[];
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

    const listData: List[] = data.map(({ memberIds, ...listItem }) => listItem);
    const memberData: ListMember[] = data.flatMap(
        ({ listId, memberIds }) => memberIds?.map(userId => ({ listId, userId, canEdit: "1" })) ?? []
    );

    const result = await db(lamington.list).insert(listData).onConflict(list.listId).merge();

    const result2 = await db(lamington.listMember)
        .whereNotIn(
            listMember.userId,
            memberData.map(({ userId }) => userId)
        )
        .delete();

    if (memberData.length > 0) {
        const result3 = await db(lamington.listMember)
            .insert(memberData)
            .onConflict([listMember.listId, listMember.userId])
            .merge();
    }

    const listIds = data.map(({ listId }) => listId);

    const query = db<List>(lamington.list).select("*").whereIn(list.listId, listIds);
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
const createListItems = async (listItems: CreateQuery<CreateListItemParams>): CreateResponse<ListItem> => {
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

interface DeleteListParams {
    listId: string;
}

/**
 * Deletes lists by list ids
 */
const deleteLists = async (lists: CreateQuery<DeleteListParams>): DeleteResponse => {
    if (!Array.isArray(lists)) {
        lists = [lists];
    }

    const listIds = lists.map(({ listId }) => listId);

    return db(lamington.list).whereIn(list.listId, listIds).delete();
};

interface DeleteListMemberParams {
    listId: string;
    userId: string;
}

/**
 * Creates a new list from params
 * @returns the newly created lists
 */
const deleteListMembers = async (listMembers: CreateQuery<DeleteListMemberParams>): DeleteResponse => {
    if (!Array.isArray(listMembers)) {
        listMembers = [listMembers];
    }

    const listIds = listMembers.map(({ listId }) => listId);
    const userIds = listMembers.map(({ userId }) => userId);

    return db(lamington.listMember).whereIn(listMember.listId, listIds).whereIn(listMember.userId, userIds).delete();
};

interface GetListMembersParams {
    listId: string;
}

interface GetListMembersResponse extends Pick<ListMember, "userId" | "canEdit">, Pick<User, "firstName" | "lastName"> {}

/**
 * Get lists by id or ids
 * @returns an array of lists matching given ids
 */
const readListMembers = async (params: ReadQuery<GetListMembersParams>): ReadResponse<GetListMembersResponse> => {
    if (!Array.isArray(params)) {
        params = [params];
    }
    const listIds = params.map(({ listId }) => listId);

    const query = db<ListItem>(lamington.listMember)
        .select(listMember.userId, listMember.canEdit, user.firstName, user.lastName)
        .whereIn(listMember.listId, listIds)
        .leftJoin(lamington.user, listMember.userId, user.userId);
    return query;
};

export const ListActions = {
    create: createLists,
    createItems: createListItems,
    delete: deleteLists,
    deleteItems: deleteListItems,
    deleteMembers: deleteListMembers,
    read: readLists,
    readAll: readAllLists,
    readItems: readListItems,
    readMembers: readListMembers,
    readMy: readMyLists,
};

interface ReadListInternalParams {
    listId: string;
}

/**
 * Get lists by id or ids
 * @returns an array of lists matching given ids
 */
const readListsInternal = async (params: ReadQuery<ReadListInternalParams>): ReadResponse<List> => {
    if (!Array.isArray(params)) {
        params = [params];
    }

    const listIds = params.map(({ listId }) => listId);

    const query = db<List>(lamington.list)
        .select(list.listId, list.name, list.description, list.createdBy)
        .whereIn(list.listId, listIds);
    return query;
};

export const InternalListActions = {
    readLists: readListsInternal,
};
