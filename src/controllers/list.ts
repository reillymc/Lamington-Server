import { v4 as Uuid } from "uuid";

import { EnsureArray, Undefined } from "../utils";
import db, { list, lamington, listMember, user, List, GetColumns } from "../database";
import { CreateListMemberParams, ListMemberActions } from "./listMember";
import { ListService } from "./spec";

const readMyLists: ListService["ReadByUser"] = async ({ userId }) => {
    const query = db(lamington.list)
        .select(
            GetColumns<ListService, "ReadByUser">({
                listId: list.listId,
                name: list.name,
                customisations: list.customisations,
                createdBy: list.createdBy,
                description: list.description,
                createdByName: `${user.firstName} as createdByName`,
                accepted: listMember.accepted,
                canEdit: listMember.canEdit,
            })
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
        const result = await db(lamington.list)
            .select(
                GetColumns<ListService, "Read">({
                    listId: list.listId,
                    name: list.name,
                    customisations: list.customisations,
                    createdBy: list.createdBy,
                    description: list.description,
                    createdByName: `${user.firstName} as createdByName`,
                    accepted: listMember.accepted,
                    canEdit: listMember.canEdit,
                })
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

    const data = lists.map(({ listId, ...params }) => ({ listId: listId ?? Uuid(), ...params })).filter(Undefined);

    const listData: List[] = data.map(({ members, ...listItem }) => listItem);
    await db(lamington.list).insert(listData).onConflict(list.listId).merge();

    const memberData: CreateListMemberParams[] = data.flatMap(({ listId, members }) => ({
        listId,
        members:
            members?.map(({ userId, allowEditing }) => ({
                userId,
                allowEditing,
                accepted: false,
            })) ?? [],
    }));

    if (memberData.length > 0) {
        await ListMemberActions.save(memberData, { preserveAccepted: true, trimNotIn: true });
    }

    return db<List>(lamington.list)
        .select(list.listId, list.name)
        .whereIn(
            list.listId,
            data.map(({ listId }) => listId)
        );
};

const deleteLists: ListService["Delete"] = async params =>
    db(lamington.list).whereIn(list.listId, EnsureArray(params)).delete();

const readListsInternal: ListService["ReadSummary"] = async params => {
    const listIds = EnsureArray(params).map(({ listId }) => listId);

    const query = db(lamington.list)
        .select(GetColumns<ListService, "ReadSummary">({ listId: list.listId, createdBy: list.createdBy }))
        .whereIn(list.listId, listIds);

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
