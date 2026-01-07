import { ContentMemberActions } from "../../controllers/index.ts";
import { list, listColumns, type List } from "../../database/definitions/list.ts";
import { listItem, listItemColumns } from "../../database/definitions/listItem.ts";
import { content } from "../../database/definitions/content.ts";
import { contentMember } from "../../database/definitions/contentMember.ts";
import { user } from "../../database/definitions/user.ts";
import { lamington, type KnexDatabase } from "../../database/index.ts";
import { EnsureArray, toUndefined } from "../../utils/index.ts";
import type { ListRepository } from "../listRepository.ts";
import { withContentReadPermissions } from "./common/contentQueries.ts";
import { buildUpdateRecord } from "./common/buildUpdateRecord.ts";
import { isForeignKeyViolation } from "./common/postgresErrors.ts";
import { ForeignKeyViolationError } from "../common/errors.ts";

const formatListItem = (item: any): Awaited<ReturnType<ListRepository["readAllItems"]>>["items"][number] => ({
    itemId: item.itemId,
    listId: item.listId,
    name: item.name,
    completed: !!item.completed,
    ingredientId: toUndefined(item.ingredientId),
    unit: toUndefined(item.unit),
    amount: item.amount,
    updatedAt: item.updatedAt,
    notes: toUndefined(item.notes),
    owner: {
        userId: item.createdBy,
        firstName: item.firstName,
    },
});

const readItemsByIds = async (db: KnexDatabase, listId: string, itemIds: string[]) => {
    const result = await db(lamington.listItem)
        .select(
            listItem.itemId,
            listItem.listId,
            listItem.name,
            listItem.completed,
            listItem.ingredientId,
            listItem.unit,
            listItem.amount,
            listItem.notes,
            content.createdBy,
            content.updatedAt,
            user.firstName
        )
        .leftJoin(lamington.content, listItem.itemId, content.contentId)
        .leftJoin(lamington.user, content.createdBy, user.userId)
        .whereIn(listItem.itemId, itemIds)
        .modify(qb => {
            if (listId) qb.where(listItem.listId, listId);
        });

    return result.map(formatListItem);
};

const read: ListRepository<KnexDatabase>["read"] = async (db, { lists, userId }) => {
    const result: any[] = await db(lamington.list)
        .select(
            list.listId,
            list.name,
            list.description,
            list.customisations,
            content.createdBy,
            user.firstName,
            contentMember.status
        )
        .whereIn(
            list.listId,
            lists.map(({ listId }) => listId)
        )
        .leftJoin(lamington.content, list.listId, content.contentId)
        .leftJoin(lamington.user, content.createdBy, user.userId)
        .modify(withContentReadPermissions({ userId, idColumn: list.listId, allowedStatuses: ["A", "M"] }));

    return {
        userId,
        lists: result.map(l => ({
            listId: l.listId,
            name: l.name,
            description: toUndefined(l.description),
            color: l.customisations?.color,
            icon: l.customisations?.icon,
            owner: { userId: l.createdBy, firstName: l.firstName },
            status: l.status ?? "O",
        })),
    };
};

export const KnexListRepository: ListRepository<KnexDatabase> = {
    verifyPermissions: async (db, { userId, status, lists }) => {
        const statuses = EnsureArray(status);
        const memberStatuses = statuses.filter(s => s !== "O");

        const listOwners: Array<Pick<List, "listId">> = await db(lamington.list)
            .select(list.listId)
            .leftJoin(lamington.content, content.contentId, list.listId)
            .whereIn(
                list.listId,
                lists.map(({ listId }) => listId)
            )
            .modify(
                withContentReadPermissions({
                    userId,
                    idColumn: list.listId,
                    allowedStatuses: memberStatuses,
                    ownerColumns: statuses.includes("O") ? undefined : [],
                })
            );

        const permissionMap = Object.fromEntries(listOwners.map(l => [l.listId, true]));

        return {
            userId,
            status,
            lists: lists.map(({ listId }) => ({
                listId,
                hasPermissions: permissionMap[listId] ?? false,
            })),
        };
    },
    read,
    readAll: async (db, { userId, filter }) => {
        const listItems: any[] = await db(lamington.list)
            .select(
                list.listId,
                list.name,
                list.description,
                list.customisations,
                content.createdBy,
                user.firstName,
                contentMember.status
            )
            .leftJoin(lamington.content, list.listId, content.contentId)
            .leftJoin(lamington.user, content.createdBy, user.userId)
            .modify(withContentReadPermissions({ userId, idColumn: list.listId, allowedStatuses: ["A", "M", "P"] }))
            .modify(qb => {
                if (filter?.owner) {
                    qb.where({ [content.createdBy]: filter.owner });
                }
            });

        return {
            userId,
            lists: listItems.map(l => ({
                listId: l.listId,
                name: l.name,
                description: toUndefined(l.description),
                color: l.customisations?.color,
                icon: l.customisations?.icon,
                owner: { userId: l.createdBy, firstName: l.firstName },
                status: l.status ?? "O",
            })),
        };
    },
    create: async (db, { userId, lists }) => {
        const newContent = await db(lamington.content)
            .insert(lists.map(() => ({ createdBy: userId })))
            .returning("contentId");

        const listsToCreate = newContent.map(({ contentId }, index) => ({
            ...lists[index],
            listId: contentId,
        }));

        await db(lamington.list).insert(
            listsToCreate.map(({ name, listId, color, icon, description }) => ({
                name,
                listId,
                customisations: { color, icon },
                description,
            }))
        );

        return read(db, { userId, lists: listsToCreate });
    },
    update: async (db, { userId, lists }) => {
        for (const l of lists) {
            const updateData = buildUpdateRecord(l, listColumns, {
                color: { target: "customisations", transform: color => ({ color }) },
                icon: { target: "customisations", transform: icon => ({ icon }) },
            });

            if (updateData) {
                await db(lamington.list).where(list.listId, l.listId).update(updateData);
            }
        }

        return read(db, { userId, lists });
    },
    delete: async (db, params) => {
        const count = await db(lamington.content)
            .whereIn(
                content.contentId,
                params.lists.map(({ listId }) => listId)
            )
            .delete();
        return { count };
    },
    readAllItems: async (db, { userId, filter }) => {
        const listContentAlias = "listContent";
        const result = await db(lamington.listItem)
            .select(
                listItem.itemId,
                listItem.listId,
                listItem.name,
                listItem.completed,
                listItem.ingredientId,
                listItem.unit,
                listItem.amount,
                listItem.notes,
                content.createdBy,
                content.updatedAt,
                user.firstName
            )
            .leftJoin(lamington.content, listItem.itemId, content.contentId)
            .leftJoin(lamington.user, content.createdBy, user.userId)
            .leftJoin(`${lamington.content} as ${listContentAlias}`, listItem.listId, `${listContentAlias}.contentId`)
            .modify(
                withContentReadPermissions({
                    userId,
                    idColumn: listItem.listId,
                    ownerColumns: `${listContentAlias}.createdBy`,
                    allowedStatuses: ["A", "M"],
                })
            )
            .where(listItem.listId, filter.listId);

        return { items: result.map(formatListItem) };
    },
    createItems: async (db, { userId, listId, items }) => {
        const newContent = await db(lamington.content)
            .insert(items.map(() => ({ createdBy: userId })))
            .returning("contentId");

        const itemsToCreate = items.map((item, index) => ({
            ...item,
            itemId: newContent[index].contentId,
        }));

        await db(lamington.listItem).insert(
            itemsToCreate.map(item => ({
                listId,
                itemId: item.itemId,
                name: item.name,
                completed: item.completed ?? false,
                ingredientId: item.ingredientId,
                unit: item.unit,
                amount: item.amount,
                notes: item.notes,
            }))
        );

        const updatedItems = await readItemsByIds(
            db,
            listId,
            itemsToCreate.map(i => i.itemId)
        );

        return { listId, items: updatedItems };
    },
    updateItems: async (db, { listId, items }) => {
        for (const item of items) {
            const updateData = buildUpdateRecord(item, listItemColumns);
            if (updateData) {
                await db(lamington.listItem)
                    .where(listItem.itemId, item.itemId)
                    .andWhere(listItem.listId, listId)
                    .update(updateData);
            }
        }

        const updatedItems = await readItemsByIds(
            db,
            listId,
            items.map(i => i.itemId)
        );

        return { listId, items: updatedItems };
    },
    deleteItems: async (db, { listId, items }) => {
        const count = await db(lamington.content)
            .whereIn(content.contentId, qb => {
                qb.select(listItem.itemId)
                    .from(lamington.listItem)
                    .where(listItem.listId, listId)
                    .whereIn(
                        listItem.itemId,
                        items.map(i => i.itemId)
                    );
            })
            .delete();
        return { listId, count };
    },
    countOutstandingItems: async (db, request) => {
        const listIds = EnsureArray(request).map(({ listId }) => listId);

        const results = await db(lamington.listItem)
            .select(listItem.listId)
            .count({ count: listItem.itemId })
            .whereIn(listItem.listId, listIds)
            .where(listItem.completed, false)
            .groupBy(listItem.listId);

        const countMap = new Map(results.map((r: any) => [r.listId, Number(r.count)]));

        return listIds.map(listId => ({
            listId,
            count: countMap.get(listId) ?? 0,
        }));
    },
    getLatestUpdatedTimestamp: async (db, request) => {
        const listIds = EnsureArray(request).map(({ listId }) => listId);

        const results = await db(lamington.listItem)
            .select(listItem.listId)
            .max(content.updatedAt, { as: "updatedAt" })
            .leftJoin(lamington.content, listItem.itemId, content.contentId)
            .whereIn(listItem.listId, listIds)
            .groupBy(listItem.listId);

        const resultMap = new Map(results.map((r: any) => [r.listId, r.updatedAt]));

        return listIds.map(listId => ({
            listId,
            updatedAt: toUndefined(resultMap.get(listId)),
        }));
    },
    readMembers: async (db, request) => {
        const requests = EnsureArray(request);
        const allMembers = await ContentMemberActions.read(
            db,
            requests.map(({ listId }) => ({ contentId: listId }))
        );

        const membersByListId = allMembers.reduce<Record<string, typeof allMembers>>((acc, member) => {
            acc[member.contentId] = [...(acc[member.contentId] ?? []), member];
            return acc;
        }, {});

        return requests.map(({ listId }) => ({
            listId,
            members: (membersByListId[listId] ?? []).map(({ contentId, status, ...rest }) => ({
                ...rest,
                status: toUndefined(status),
            })),
        }));
    },
    saveMembers: async (db, request) => {
        try {
            const response = await ContentMemberActions.save(
                db,
                EnsureArray(request).map(({ listId, members }) => ({ contentId: listId, members }))
            );
            return response.map(({ contentId, members }) => ({
                listId: contentId,
                members: members.map(({ status, ...rest }) => ({ ...rest, status: toUndefined(status) })),
            }));
        } catch (error) {
            if (isForeignKeyViolation(error)) {
                throw new ForeignKeyViolationError(error);
            }
            throw error;
        }
    },
    updateMembers: (db, params) =>
        ContentMemberActions.save(
            db,
            EnsureArray(params).map(({ listId, members }) => ({ contentId: listId, members })),
            {
                trimNotIn: false,
            }
        ).then(response =>
            response.map(({ contentId, members }) => ({
                listId: contentId,
                members: members.map(({ status, ...rest }) => ({ ...rest, status: toUndefined(status) })),
            }))
        ),
    removeMembers: (db, request) =>
        ContentMemberActions.delete(
            db,
            EnsureArray(request).map(({ listId, members }) => ({ contentId: listId, members }))
        ).then(response => response.map(({ contentId, ...rest }) => ({ listId: contentId, ...rest }))),
};
