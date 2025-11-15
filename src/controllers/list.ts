import { content, type Content } from "../database/definitions/content.ts";
import { contentMember } from "../database/definitions/contentMember.ts";
import db, { type List, lamington, list, user } from "../database/index.ts";
import { EnsureArray } from "../utils/index.ts";
import { ListMemberActions } from "./listMember.ts";
import type { ListService } from "./spec/index.ts";

const readMyLists: ListService["ReadByUser"] = async ({ userId }) => {
    const query = db(lamington.list)
        .select(
            list.listId,
            "name",
            "customisations",
            content.createdBy,
            "description",
            `${user.firstName} as createdByName`,
            contentMember.status
        )
        .where({ [content.createdBy]: userId })
        .orWhere({ [contentMember.userId]: userId })
        .leftJoin(lamington.content, list.listId, content.contentId)
        .leftJoin(lamington.user, content.createdBy, user.userId)
        .leftJoin(lamington.contentMember, list.listId, contentMember.contentId);

    return query;
};

const readLists: ListService["Read"] = async params => {
    const requests = EnsureArray(params);
    const response = [];

    // TODO move to single query
    for (const { listId, userId } of requests) {
        const result = await db(lamington.list)
            .select(
                list.listId,
                "name",
                "customisations",
                content.createdBy,
                "description",
                `${user.firstName} as createdByName`,
                contentMember.status
            )
            .where({ [list.listId]: listId })
            .andWhere(qb => qb.where({ [content.createdBy]: userId }).orWhere({ [contentMember.userId]: userId }))
            .orWhere({ [content.createdBy]: userId, [list.listId]: listId })
            .leftJoin(lamington.content, content.contentId, list.listId)
            .leftJoin(lamington.user, content.createdBy, user.userId)
            .leftJoin(lamington.contentMember, list.listId, contentMember.contentId)
            .first();

        if (result) response.push(result);
    }

    return response;
};

const saveLists: ListService["Save"] = async params => {
    const lists = EnsureArray(params);

    const listData: List[] = lists.map(({ members, createdBy, ...listItem }) => listItem);

    // const result = await db.transaction(async trx => {
    await db<Content>(lamington.content)
        .insert(
            lists.map(({ listId, createdBy }) => ({
                contentId: listId,
                createdBy,
            }))
        )
        .onConflict("contentId")
        .merge();

    const savedLists = await db<List>(lamington.list)
        .insert(listData)
        .onConflict("listId")
        .merge()
        .returning(["listId", "name"]);

    const result = await db(lamington.list)
        .select("list.*", "content.createdBy", "content.createdAt")
        .whereIn(
            "listId",
            savedLists.map(list => list.listId)
        )
        .join(lamington.content, "list.listId", "content.contentId");
    // });

    if (lists.length > 0) {
        await ListMemberActions.save(lists, { trimNotIn: true });
    }

    return result;
};

const deleteLists: ListService["Delete"] = async params => {
    const listIds = EnsureArray(params).map(({ listId }) => listId);

    await db<List>(lamington.list).whereIn("listId", listIds).delete();
    return db(lamington.content).whereIn(content.contentId, listIds).delete();
};

/**
 * Get lists by id or ids.
 * @returns an array of lists matching given ids that the user has permissions to see, as well as the user's
 * permission level on the list.
 */
const readPermissions: ListService["ReadPermissions"] = async params => {
    const lists = EnsureArray(params);
    const listsItems = lists.map(({ listId, userId }) => [listId, userId]);

    if (!listsItems.length) return [];

    return db<List>(lamington.list)
        .select(list.listId, content.createdBy, contentMember.status)
        .whereIn(
            list.listId,
            lists.map(({ listId }) => listId)
        )
        .leftJoin(lamington.content, list.listId, content.contentId)
        .leftJoin(lamington.contentMember, builder => {
            builder.on(list.listId, "=", contentMember.contentId).andOnIn(
                contentMember.userId,
                lists.map(({ userId }) => userId)
            );
        });
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
    ReadPermissions: readPermissions,
};
