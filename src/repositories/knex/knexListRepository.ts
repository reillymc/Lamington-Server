import { EnsureArray } from "../../utils/index.ts";
import type { ListRepository } from "../listRepository.ts";
import { buildUpdateRecord } from "./common/dataFormatting/buildUpdateRecord.ts";
import { toUndefined } from "./common/dataFormatting/toUndefined.ts";
import { withContentAuthor } from "./common/queryBuilders/withContentAuthor.ts";
import { withContentPermissions } from "./common/queryBuilders/withContentPermissions.ts";
import { createDeleteContent } from "./common/repositoryMethods/content.ts";
import { ContentMemberActions } from "./common/repositoryMethods/contentMember.ts";
import { verifyContentPermissions } from "./common/repositoryMethods/contentPermissions.ts";
import type { KnexDatabase } from "./knex.ts";
import {
    ContentMemberTable,
    ContentTable,
    ListItemTable,
    ListTable,
    lamington,
} from "./spec/index.ts";

const formatListItem = (
    item: any,
): Awaited<ReturnType<ListRepository["readAllItems"]>>["items"][number] => ({
    itemId: item.itemId,
    listId: item.listId,
    name: item.name,
    completed: !!item.completed,
    ingredientId: toUndefined(item.ingredientId),
    unit: toUndefined(item.unit),
    amount: toUndefined(item.amount),
    updatedAt: item.updatedAt,
    notes: toUndefined(item.notes),
    owner: {
        userId: item.createdBy,
        firstName: item.firstName,
    },
});

const readItemsByIds = async (
    db: KnexDatabase,
    userId: string,
    listId: string,
    itemIds: string[],
) => {
    const result = await db(lamington.listItem)
        .select(
            ListItemTable.itemId,
            ListItemTable.listId,
            ListItemTable.name,
            ListItemTable.completed,
            ListItemTable.ingredientId,
            ListItemTable.unit,
            ListItemTable.amount,
            ListItemTable.notes,
            ContentTable.updatedAt,
        )
        .leftJoin(
            lamington.content,
            ListItemTable.itemId,
            ContentTable.contentId,
        )
        .whereIn(ListItemTable.itemId, itemIds)
        .modify((qb) => {
            if (listId) qb.where(ListItemTable.listId, listId);
        })
        .modify(withContentAuthor)
        .modify(
            withContentPermissions({
                userId,
                idColumn: ListItemTable.listId,
                statuses: ["O", "A", "M"],
            }),
        );

    return result.map(formatListItem);
};

const read: ListRepository<KnexDatabase>["read"] = async (
    db,
    { lists, userId },
) => {
    const result: any[] = await db(lamington.list)
        .select(
            ListTable.listId,
            ListTable.name,
            ListTable.description,
            ListTable.customisations,
            ContentMemberTable.status,
        )
        .whereIn(
            ListTable.listId,
            lists.map(({ listId }) => listId),
        )
        .leftJoin(lamington.content, ListTable.listId, ContentTable.contentId)
        .modify(withContentAuthor)
        .modify(
            withContentPermissions({
                userId,
                idColumn: ListTable.listId,
                statuses: ["O", "A", "M"],
            }),
        );

    return {
        userId,
        lists: result.map((l) => ({
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
    read,
    readItems: async (db, { userId, listId, items }) => {
        const result = await readItemsByIds(
            db,
            userId,
            listId,
            items.map((i) => i.itemId),
        );

        return { items: result, listId };
    },
    readAll: async (db, { userId, filter }) => {
        const listItems: any[] = await db(lamington.list)
            .select(
                ListTable.listId,
                ListTable.name,
                ListTable.description,
                ListTable.customisations,
                ContentMemberTable.status,
            )
            .leftJoin(
                lamington.content,
                ListTable.listId,
                ContentTable.contentId,
            )
            .modify(withContentAuthor)
            .modify(
                withContentPermissions({
                    userId,
                    idColumn: ListTable.listId,
                    statuses: ["O", "A", "M", "P"],
                }),
            )
            .modify((qb) => {
                if (filter?.owner) {
                    qb.where({ [ContentTable.createdBy]: filter.owner });
                }
            });

        return {
            userId,
            lists: listItems.map((l) => ({
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
            })),
        );

        return read(db, { userId, lists: listsToCreate });
    },
    update: async (db, { userId, lists }) => {
        for (const l of lists) {
            const updateData = buildUpdateRecord(l, ListTable, {
                customisations: ({ color, icon }) => {
                    if (color === undefined && icon === undefined)
                        return undefined;
                    return {
                        ...(color !== undefined ? { color } : {}),
                        ...(icon !== undefined ? { icon } : {}),
                    };
                },
            });

            if (updateData) {
                await db(lamington.list)
                    .where(ListTable.listId, l.listId)
                    .update(updateData);
            }
        }

        return read(db, { userId, lists });
    },
    delete: createDeleteContent("lists", "listId"),
    readAllItems: async (db, { userId, filter }) => {
        const result = await db(lamington.listItem)
            .select(
                ListItemTable.itemId,
                ListItemTable.listId,
                ListItemTable.name,
                ListItemTable.completed,
                ListItemTable.ingredientId,
                ListItemTable.unit,
                ListItemTable.amount,
                ListItemTable.notes,
                ContentTable.updatedAt,
            )
            .leftJoin(
                lamington.content,
                ListItemTable.itemId,
                ContentTable.contentId,
            )
            .modify(withContentAuthor)
            .modify(
                withContentPermissions({
                    userId,
                    idColumn: ListItemTable.listId,
                    statuses: ["O", "A", "M"],
                }),
            )
            .where(ListItemTable.listId, filter.listId);

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
            itemsToCreate.map((item) => ({
                listId,
                itemId: item.itemId,
                name: item.name,
                completed: item.completed ?? false,
                ingredientId: item.ingredientId,
                unit: item.unit,
                amount: item.amount,
                notes: item.notes,
            })),
        );

        const updatedItems = await readItemsByIds(
            db,
            userId,
            listId,
            itemsToCreate.map((i) => i.itemId),
        );

        return { listId, items: updatedItems };
    },
    updateItems: async (db, { userId, listId, items }) => {
        for (const item of items) {
            const updateData = buildUpdateRecord(item, ListItemTable);
            if (updateData) {
                await db(lamington.listItem)
                    .where(ListItemTable.itemId, item.itemId)
                    .andWhere(ListItemTable.listId, listId)
                    .update(updateData);
            }
        }

        const updatedItems = await readItemsByIds(
            db,
            userId,
            listId,
            items.map((i) => i.itemId),
        );

        return { listId, items: updatedItems };
    },
    deleteItems: async (db, { listId, items }) => {
        const count = await db(lamington.content)
            .whereIn(ContentTable.contentId, (qb) => {
                qb.select(ListItemTable.itemId)
                    .from(lamington.listItem)
                    .where(ListItemTable.listId, listId)
                    .whereIn(
                        ListItemTable.itemId,
                        items.map((i) => i.itemId),
                    );
            })
            .delete();
        return { listId, count };
    },
    moveItems: async (db, { userId, listId, items }) => {
        if (items.length === 0) {
            return { listId, items: [] };
        }

        await db(lamington.listItem)
            .whereIn(
                ListItemTable.itemId,
                items.map((i) => i.itemId),
            )
            .update({ listId });

        const updatedItems = await readItemsByIds(
            db,
            userId,
            listId,
            items.map((i) => i.itemId),
        );

        return { listId, items: updatedItems };
    },
    countOutstandingItems: async (db, request) => {
        const listIds = EnsureArray(request).map(({ listId }) => listId);

        const results = await db(lamington.listItem)
            .select(ListItemTable.listId)
            .count({ count: ListItemTable.itemId })
            .whereIn(ListItemTable.listId, listIds)
            .where(ListItemTable.completed, false)
            .groupBy(ListItemTable.listId);

        const countMap = new Map(
            results.map((r: any) => [r.listId, Number(r.count)]),
        );

        return listIds.map((listId) => ({
            listId,
            count: countMap.get(listId) ?? 0,
        }));
    },
    getLatestUpdatedTimestamp: async (db, request) => {
        const listIds = EnsureArray(request).map(({ listId }) => listId);

        const results = await db(lamington.listItem)
            .select(ListItemTable.listId)
            .max(ContentTable.updatedAt, { as: "updatedAt" })
            .leftJoin(
                lamington.content,
                ListItemTable.itemId,
                ContentTable.contentId,
            )
            .whereIn(ListItemTable.listId, listIds)
            .groupBy(ListItemTable.listId);

        const resultMap = new Map(
            results.map((r: any) => [r.listId, r.updatedAt]),
        );

        return listIds.map((listId) => ({
            listId,
            updatedAt: toUndefined(resultMap.get(listId)),
        }));
    },
    readMembers: async (db, request) =>
        ContentMemberActions.readByContentId(
            db,
            EnsureArray(request).map(({ listId }) => listId),
        ).then((members) =>
            EnsureArray(request).map(({ listId }) => ({
                listId,
                members: members.filter((m) => m.contentId === listId),
            })),
        ),
    saveMembers: async (db, request) =>
        ContentMemberActions.save(
            db,
            EnsureArray(request).flatMap(({ listId, members = [] }) =>
                members.map(({ userId, status }) => ({
                    contentId: listId,
                    userId,
                    status,
                })),
            ),
        ).then((members = []) =>
            EnsureArray(request).map(({ listId }) => ({
                listId,
                members: members.filter(
                    ({ contentId }) => contentId === listId,
                ),
            })),
        ),
    removeMembers: async (db, request) =>
        ContentMemberActions.delete(
            db,
            EnsureArray(request).flatMap(({ listId, members = [] }) =>
                members.map(({ userId }) => ({
                    contentId: listId,
                    userId,
                })),
            ),
        ).then(() =>
            EnsureArray(request).map(({ listId, members = [] }) => ({
                listId,
                count: members.length,
            })),
        ),
    verifyPermissions: async (db, { userId, lists, status }) => {
        const listIds = EnsureArray(lists).map((l) => l.listId);
        const permissions = await verifyContentPermissions(
            db,
            userId,
            listIds,
            status,
        );
        return {
            userId,
            status,
            lists: listIds.map((listId) => ({
                listId,
                hasPermissions: permissions[listId] ?? false,
            })),
        };
    },
};
