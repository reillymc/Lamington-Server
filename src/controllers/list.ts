import db, { List, lamington, list, listMember, user } from "../database";
import { EnsureArray } from "../utils";
import { ListMemberActions } from "./listMember";
import { ListService } from "./spec";

const readMyLists: ListService["ReadByUser"] = async ({ userId }) => {
    const query = db<List>(lamington.list)
        .select(
            list.listId,
            "name",
            "customisations",
            "createdBy",
            "description",
            `${user.firstName} as createdByName`,
            listMember.status
        )
        .where({ [list.createdBy]: userId })
        .orWhere({ [listMember.userId]: userId })
        .leftJoin(lamington.user, list.createdBy, user.userId)
        .leftJoin(lamington.listMember, list.listId, listMember.listId);

    return query;
};

const readLists: ListService["Read"] = async params => {
    const requests = EnsureArray(params);

    const response = [];

    for (const { listId, userId } of requests) {
        const result = await db<List>(lamington.list)
            .select(
                list.listId,
                "name",
                "customisations",
                "createdBy",
                "description",
                `${user.firstName} as createdByName`,
                listMember.status
            )
            .where({ [list.listId]: listId })
            .andWhere(qb => qb.where({ [list.createdBy]: userId }).orWhere({ [listMember.userId]: userId }))
            .orWhere({ [list.createdBy]: userId, [list.listId]: listId })
            .leftJoin(lamington.user, list.createdBy, user.userId)
            .leftJoin(lamington.listMember, list.listId, listMember.listId)
            .first();

        if (result) response.push(result);
    }

    return response;
};

const saveLists: ListService["Save"] = async params => {
    const lists = EnsureArray(params);

    const listData: List[] = lists.map(({ members, ...listItem }) => listItem);
    const result = await db<List>(lamington.list)
        .insert(listData)
        .onConflict("listId")
        .merge()
        .returning(["listId", "name", "createdBy"]);

    if (lists.length > 0) {
        await ListMemberActions.save(lists, { trimNotIn: true });
    }

    return result;
};

const deleteLists: ListService["Delete"] = async params =>
    db<List>(lamington.list).whereIn("listId", EnsureArray(params)).delete();

const readListsInternal: ListService["ReadSummary"] = async params => {
    const listIds = EnsureArray(params).map(({ listId }) => listId);

    const query = db<List>(lamington.list).select("listId", "createdBy").whereIn("listId", listIds);

    return query;
};

export const ListActions: ListService = {
    /**
     * Deletes lists by list ids
     * @security Insecure: route authentication check required (user delete permission on lists)
     */
    Delete: deleteLists,

    /**
     * Get lists by id or ids
     * @security Secure: no authentication checks required
     * @returns an array of lists matching given ids
     */
    Read: readLists,

    /**
     * Get users lists. Includes lists created by the user and lists the user is a member of.
     * @security Secure: no authentication checks required.
     * @returns an array of lists.
     */
    ReadByUser: readMyLists,

    /**
     * Creates a new list from params
     * @security Insecure: route authentication check required (user save permission on lists)
     * @returns the newly created lists
     */
    Save: saveLists,

    /**
     * Get lists by id or ids
     * @returns an array of lists matching given ids, but only with minimal required fields to ensure performance
     */
    ReadSummary: readListsInternal,
};
