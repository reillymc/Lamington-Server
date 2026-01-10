import type { components } from "../routes/spec/index.ts";
import { ForeignKeyViolationError } from "../repositories/common/errors.ts";
import { CreatedDataFetchError, InvalidOperationError, NotFoundError, UpdatedDataFetchError } from "./logging.ts";
import { type CreateService } from "./service.ts";

export interface ListService {
    getAll: (userId: string) => Promise<ReadonlyArray<components["schemas"]["ListSummary"]>>;
    get: (userId: string, listId: string) => Promise<components["schemas"]["List"]>;
    create: (userId: string, request: components["schemas"]["ListCreate"]) => Promise<components["schemas"]["List"]>;
    update: (
        userId: string,
        listId: string,
        request: components["schemas"]["ListUpdate"]
    ) => Promise<components["schemas"]["List"]>;
    delete: (userId: string, listId: string) => Promise<void>;
    getItems: (userId: string, listId: string) => Promise<ReadonlyArray<components["schemas"]["ListItem"]>>;
    createItems: (
        userId: string,
        listId: string,
        items: ReadonlyArray<components["schemas"]["ListItemCreate"]>
    ) => Promise<ReadonlyArray<components["schemas"]["ListItem"]>>;
    updateItem: (
        userId: string,
        listId: string,
        itemId: string,
        item: components["schemas"]["ListItemUpdate"]
    ) => Promise<components["schemas"]["ListItem"]>;
    moveItems: (
        userId: string,
        listId: string,
        itemIds: ReadonlyArray<string>,
        destinationListId: string
    ) => Promise<ReadonlyArray<components["schemas"]["ListItem"]>>;
    deleteItem: (userId: string, listId: string, itemId: string) => Promise<void>;
    getMembers: (userId: string, listId: string) => Promise<ReadonlyArray<components["schemas"]["Member"]>>;
    inviteMember: (userId: string, listId: string, targetUserId: string) => Promise<void>;
    updateMember: (
        userId: string,
        listId: string,
        memberId: string,
        status: components["schemas"]["MemberUpdateStatus"]
    ) => Promise<components["schemas"]["Member"]>;
    removeMember: (userId: string, listId: string, memberId: string) => Promise<void>;
    leaveList: (userId: string, listId: string) => Promise<void>;
    acceptInvite: (userId: string, listId: string) => Promise<void>;
    declineInvite: (userId: string, listId: string) => Promise<void>;
}

export const createListService: CreateService<ListService, "listRepository"> = (database, { listRepository }) => ({
    getAll: async userId => {
        const { lists } = await listRepository.readAll(database, { userId });
        if (lists.length === 0) {
            return [];
        }

        const listIds = lists.map(l => ({ listId: l.listId }));
        const counts = await listRepository.countOutstandingItems(database, listIds);
        const timestamps = await listRepository.getLatestUpdatedTimestamp(database, listIds);

        const countMap = new Map(counts.map(c => [c.listId, c.count]));
        const timestampMap = new Map(timestamps.map(t => [t.listId, t.updatedAt]));

        return lists.map(list => ({
            ...list,
            outstandingItemCount: countMap.get(list.listId) ?? 0,
            lastUpdated: timestampMap.get(list.listId),
        }));
    },
    get: async (userId, listId) => {
        const {
            lists: [list],
        } = await listRepository.read(database, { userId, lists: [{ listId }] });

        if (!list) {
            throw new NotFoundError("list", listId);
        }

        return list;
    },
    create: (userId, request) =>
        database.transaction(async trx => {
            const { lists } = await listRepository.create(trx, { userId, lists: [request] });

            const [list] = lists;

            if (!list) {
                throw new CreatedDataFetchError("list");
            }

            return list;
        }),
    update: (userId, listId, request) =>
        database.transaction(async trx => {
            const permissions = await listRepository.verifyPermissions(trx, {
                userId,
                lists: [{ listId }],
                status: "O",
            });

            if (permissions.lists.some(({ hasPermissions }) => !hasPermissions)) {
                throw new NotFoundError("list", listId);
            }

            const { lists } = await listRepository.update(trx, {
                userId,
                lists: [{ ...request, listId }],
            });

            const [list] = lists;
            if (!list) {
                throw new UpdatedDataFetchError("list", listId);
            }

            return list;
        }),
    delete: (userId, listId) =>
        database.transaction(async trx => {
            const permissions = await listRepository.verifyPermissions(trx, {
                userId,
                lists: [{ listId }],
                status: "O",
            });

            if (permissions.lists.some(({ hasPermissions }) => !hasPermissions)) {
                throw new NotFoundError("list", listId);
            }

            await listRepository.delete(trx, { lists: [{ listId }] });
        }),
    getItems: async (userId, listId) => {
        const permissions = await listRepository.verifyPermissions(database, {
            userId,
            lists: [{ listId }],
            status: ["O", "A", "M"],
        });

        if (permissions.lists.some(({ hasPermissions }) => !hasPermissions)) {
            throw new NotFoundError("list", listId);
        }

        const { items } = await listRepository.readAllItems(database, {
            userId,
            filter: {
                listId,
            },
        });
        return items;
    },
    createItems: (userId, listId, items) =>
        database.transaction(async trx => {
            const permissions = await listRepository.verifyPermissions(trx, {
                userId,
                lists: [{ listId }],
                status: ["O", "A"],
            });

            if (permissions.lists.some(({ hasPermissions }) => !hasPermissions)) {
                throw new NotFoundError("list", listId);
            }

            const { items: createdItems } = await listRepository.createItems(trx, { listId, userId, items });

            return createdItems;
        }),
    updateItem: (userId, listId, itemId, request) =>
        database.transaction(async trx => {
            const permissions = await listRepository.verifyPermissions(trx, {
                userId,
                lists: [{ listId }],
                status: ["O", "A"],
            });

            if (permissions.lists.some(({ hasPermissions }) => !hasPermissions)) {
                throw new NotFoundError("list", listId);
            }

            const { items } = await listRepository.updateItems(trx, {
                listId,
                userId,
                items: [{ ...request, itemId }],
            });
            const [item] = items;
            if (!item) {
                throw new NotFoundError("list item", itemId);
            }

            return item;
        }),
    moveItems: (userId, listId, itemIds, destinationListId) =>
        database.transaction(async trx => {
            if (listId === destinationListId) {
                throw new InvalidOperationError("list item", "Cannot move items to the same list");
            }

            const permissions = await listRepository.verifyPermissions(trx, {
                userId,
                lists: [{ listId }, { listId: destinationListId }],
                status: ["O", "A"],
            });

            const failedPermission = permissions.lists.find(({ hasPermissions }) => !hasPermissions);
            if (failedPermission) {
                throw new NotFoundError("list", failedPermission.listId);
            }

            const { items: currentItems } = await listRepository.readItems(trx, {
                userId,
                listId,
                items: itemIds.map(itemId => ({ itemId })),
            });

            if (currentItems.length !== itemIds.length) {
                throw new NotFoundError("list item", "One or more items not found in source list");
            }

            const { items: movedItems } = await listRepository.moveItems(trx, {
                userId,
                listId: destinationListId,
                items: itemIds.map(itemId => ({ itemId })),
            });

            if (movedItems.length !== itemIds.length) {
                throw new UpdatedDataFetchError("list item", "Failed to retrieve moved items");
            }

            return movedItems;
        }),
    deleteItem: (userId, listId, itemId) =>
        database.transaction(async trx => {
            const permissions = await listRepository.verifyPermissions(trx, {
                userId,
                lists: [{ listId }],
                status: ["O", "A"],
            });

            if (permissions.lists.some(({ hasPermissions }) => !hasPermissions)) {
                throw new NotFoundError("list", listId);
            }

            const { count } = await listRepository.deleteItems(trx, { listId, items: [{ itemId }] });

            if (count === 0) {
                throw new NotFoundError("list item", itemId);
            }
        }),
    getMembers: async (userId, listId) => {
        const permissions = await listRepository.verifyPermissions(database, {
            userId,
            lists: [{ listId }],
            status: "O",
        });

        if (permissions.lists.some(({ hasPermissions }) => !hasPermissions)) {
            throw new NotFoundError("list", listId);
        }

        const [listMembers] = await listRepository.readMembers(database, { listId });

        if (!listMembers) {
            throw new NotFoundError("list", listId);
        }

        const { members } = listMembers;

        return members;
    },
    inviteMember: (userId, listId, targetUserId) =>
        database.transaction(async trx => {
            const permissions = await listRepository.verifyPermissions(trx, {
                userId,
                lists: [{ listId }],
                status: "O",
            });

            if (permissions.lists.some(({ hasPermissions }) => !hasPermissions)) {
                throw new NotFoundError("list", listId);
            }

            const [currentMembers] = await listRepository.readMembers(trx, { listId });
            if (currentMembers?.members.some(m => m.userId === targetUserId)) {
                throw new InvalidOperationError("list member", "User is already a member");
            }

            try {
                await listRepository.saveMembers(trx, {
                    listId,
                    members: [{ userId: targetUserId, status: "P" }],
                });
            } catch (error: unknown) {
                if (error instanceof ForeignKeyViolationError) {
                    throw new NotFoundError("user", targetUserId);
                }
                throw error;
            }
        }),
    updateMember: (userId, listId, memberId, status) =>
        database.transaction(async trx => {
            const permissions = await listRepository.verifyPermissions(trx, {
                userId,
                lists: [{ listId }],
                status: "O",
            });

            if (permissions.lists.some(({ hasPermissions }) => !hasPermissions)) {
                throw new NotFoundError("list", listId);
            }

            const [currentListMembers] = await listRepository.readMembers(trx, { listId });
            const currentMember = currentListMembers?.members.find(m => m.userId === memberId);

            if (!currentMember) {
                throw new NotFoundError("list member", memberId);
            }

            if (currentMember.status === "P") {
                throw new InvalidOperationError("list member", "Cannot update a pending member");
            }

            await listRepository.saveMembers(trx, {
                listId,
                members: [{ userId: memberId, status }],
            });

            const [listMembers] = await listRepository.readMembers(trx, { listId });

            const member = listMembers?.members.find(m => m.userId === memberId);

            if (!member) {
                throw new NotFoundError("list member", memberId);
            }

            return member;
        }),
    removeMember: (userId, listId, memberId) =>
        database.transaction(async trx => {
            const permissions = await listRepository.verifyPermissions(trx, {
                userId,
                lists: [{ listId }],
                status: "O",
            });

            if (permissions.lists.some(({ hasPermissions }) => !hasPermissions)) {
                throw new NotFoundError("list", listId);
            }

            if (memberId === userId) {
                throw new InvalidOperationError("list member", "Cannot remove self via this endpoint");
            }

            await listRepository.removeMembers(trx, { listId, members: [{ userId: memberId }] });
        }),
    leaveList: (userId, listId) =>
        database.transaction(async trx => {
            const permissions = await listRepository.verifyPermissions(trx, {
                userId,
                lists: [{ listId }],
                status: ["A", "M"],
            });
            if (permissions.lists.some(({ hasPermissions }) => !hasPermissions)) {
                throw new NotFoundError("list", listId);
            }

            await listRepository.removeMembers(trx, { listId, members: [{ userId }] });
        }),
    acceptInvite: (userId, listId) =>
        database.transaction(async trx => {
            const permissions = await listRepository.verifyPermissions(trx, {
                userId,
                lists: [{ listId }],
                status: "P",
            });

            if (permissions.lists.some(({ hasPermissions }) => !hasPermissions)) {
                throw new NotFoundError("list", listId);
            }

            await listRepository.saveMembers(trx, {
                listId,
                members: [{ userId, status: "M" }],
            });
        }),
    declineInvite: (userId, listId) =>
        database.transaction(async trx => {
            const permissions = await listRepository.verifyPermissions(trx, {
                userId,
                lists: [{ listId }],
                status: "P",
            });

            if (permissions.lists.some(({ hasPermissions }) => !hasPermissions)) {
                throw new NotFoundError("list", listId);
            }

            await listRepository.removeMembers(trx, { listId, members: [{ userId }] });
        }),
});
