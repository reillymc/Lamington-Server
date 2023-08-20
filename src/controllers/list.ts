import { v4 as Uuid } from "uuid";

import { EnsureArray, Undefined } from "../utils";
import db, {
    ReadResponse,
    list,
    lamington,
    listMember,
    user,
    ListMember,
    List,
    User,
    ReadMyService,
    ReadService,
    SaveService,
    DeleteService,
} from "../database";
import { EntityMember } from "./entity";
import { CreateListMemberParams, ListMemberActions } from "./listMember";

interface ReadListRow extends Pick<List, "listId" | "name" | "customisations" | "createdBy" | "description"> {
    createdByName: User["firstName"];
    accepted: ListMember["accepted"];
    canEdit: ListMember["canEdit"];
}

const readMyLists: ReadMyService<ReadListRow> = async ({ userId }) => {
    const query = db<ReadListRow>(lamington.list)
        .select(
            list.listId,
            list.name,
            list.customisations,
            list.description,
            list.createdBy,
            `${user.firstName} as createdByName`,
            listMember.accepted,
            listMember.canEdit
        )
        .where({ [list.createdBy]: userId })
        .orWhere({ [listMember.userId]: userId })
        .leftJoin(lamington.user, list.createdBy, user.userId)
        .leftJoin(lamington.listMember, list.listId, listMember.listId);

    return query;
};

const readLists: ReadService<ReadListRow, "listId", Pick<User, "userId">> = async params => {
    const requests = EnsureArray(params);

    const response: ReadListRow[] = [];

    for (const { listId, userId } of requests) {
        const result: ReadListRow = await db<ReadListRow>(lamington.list)
            .select(
                list.listId,
                list.name,
                list.customisations,
                list.description,
                list.createdBy,
                `${user.firstName} as createdByName`,
                listMember.accepted,
                listMember.canEdit
            )
            .where({ [list.listId]: listId })
            .andWhere(qb => qb.where({ [list.createdBy]: userId }).orWhere({ [listMember.userId]: userId }))
            .orWhere({ [list.createdBy]: userId, [list.listId]: listId })
            .leftJoin(lamington.user, list.createdBy, user.userId)
            .leftJoin(lamington.listMember, list.listId, listMember.listId);

        response.push(result);
    }

    return response;
};

const saveLists: SaveService<List & { members?: Array<EntityMember> }> = async params => {
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

const deleteLists: DeleteService<List, "listId"> = async params =>
    db(lamington.list).whereIn(list.listId, EnsureArray(params)).delete();

export const ListActions = {
    /**
     * Deletes lists by list ids
     * @security Insecure: route authentication check required (user delete permission on lists)
     */
    delete: deleteLists,

    /**
     * Get lists by id or ids
     * @security Secure: no authentication checks required
     * @returns an array of lists matching given ids
     */
    read: readLists,

    /**
     * Get users lists. Includes lists created by the user and lists the user is a member of.
     * @security Secure: no authentication checks required.
     * @returns an array of lists.
     */
    readMy: readMyLists,

    /**
     * Creates a new list from params
     * @security Insecure: route authentication check required (user save permission on lists)
     * @returns the newly created lists
     */
    save: saveLists,
};

export type ListActions = typeof ListActions;

const readListsInternal: ReadService<List, "listId"> = async params => {
    const listIds = EnsureArray(params).map(({ listId }) => listId);

    const query = db<List>(lamington.list)
        .select(list.listId, list.name, list.description, list.createdBy)
        .whereIn(list.listId, listIds);

    return query;
};

const readAllLists = async (): ReadResponse<List> => {
    const query = db<List>(lamington.list).select(list.listId, list.name, list.createdBy);
    return query;
};

export const InternalListActions = {
    /**
     * Get lists by id or ids
     * @returns an array of lists matching given ids
     */
    read: readListsInternal,

    /**
     * Get all lists
     * @returns an array of all lists in the database
     */
    readAll: readAllLists,
};

export type InternalListActions = typeof InternalListActions;
