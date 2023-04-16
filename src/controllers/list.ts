import { v4 as Uuid } from "uuid";

import { Undefined } from "../utils";
import db, {
    CreateResponse,
    ReadResponse,
    list,
    lamington,
    ReadQuery,
    CreateQuery,
    listMember,
    user,
    ListMember,
    List,
    DeleteResponse,
    User,
} from "../database";

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
    accepted: ListMember["accepted"];
}

/**
 * Get users lists
 * @returns an array of users lists in the database
 */
const readMyLists = async ({ userId }: GetMyListsParams): ReadResponse<ReadListRow> => {
    const query = db<ReadListRow>(lamington.list)
        .select(
            list.listId,
            list.name,
            list.description,
            list.createdBy,
            `${user.firstName} as createdByName`,
            listMember.accepted
        )
        .where({ [list.createdBy]: userId })
        .orWhere({ [listMember.userId]: userId })
        .leftJoin(lamington.user, list.createdBy, user.userId)
        .leftJoin(lamington.listMember, list.listId, listMember.listId);

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
        .where({ [list.listId]: listId })
        .andWhere(qb => qb.where({ [list.createdBy]: userId }).orWhere({ [listMember.userId]: userId }))
        .orWhere({ [list.createdBy]: userId, [list.listId]: listId })
        .leftJoin(lamington.user, list.createdBy, user.userId)
        .leftJoin(lamington.listMember, list.listId, listMember.listId);

    return query;
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
const saveLists = async (lists: CreateQuery<CreateListParams>): CreateResponse<List> => {
    if (!Array.isArray(lists)) {
        lists = [lists];
    }

    const data = lists.map(({ listId, ...params }) => ({ listId: listId ?? Uuid(), ...params })).filter(Undefined);
    const listIds = data.map(({ listId }) => listId);

    const listData: List[] = data.map(({ memberIds, ...listItem }) => listItem);
    const memberData: ListMember[] = data.flatMap(
        ({ listId, memberIds }) => memberIds?.map(userId => ({ listId, userId, canEdit: "1", accepted: 0 })) ?? []
    );

    const result = await db(lamington.list).insert(listData).onConflict(list.listId).merge();

    const result2 = await db(lamington.listMember)
        .whereIn(listMember.listId, listIds)
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

    return db<List>(lamington.list).select(list.listId, list.name).whereIn(list.listId, listIds);
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

export const ListActions = {
    delete: deleteLists,
    read: readLists,
    readAll: readAllLists,
    readMy: readMyLists,
    save: saveLists,
};

export const InternalListActions = {
    read: readListsInternal,
};
