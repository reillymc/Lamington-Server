import { ForeignKeyViolationError } from "../repositories/common/errors.ts";
import type { components } from "../routes/spec/index.ts";
import {
    CreatedDataFetchError,
    createService,
    InvalidOperationError,
    NotFoundError,
    UpdatedDataFetchError,
} from "./service.ts";

export interface ListService {
    getAll: (
        userId: string,
    ) => Promise<ReadonlyArray<components["schemas"]["ListSummary"]>>;
    get: (
        userId: string,
        listId: string,
    ) => Promise<components["schemas"]["List"]>;
    create: (
        userId: string,
        request: components["schemas"]["ListCreate"],
    ) => Promise<components["schemas"]["List"]>;
    update: (
        userId: string,
        listId: string,
        request: components["schemas"]["ListUpdate"],
    ) => Promise<components["schemas"]["List"]>;
    delete: (userId: string, listId: string) => Promise<void>;
    getItems: (
        userId: string,
        listId: string,
    ) => Promise<ReadonlyArray<components["schemas"]["ListItem"]>>;
    createItems: (
        userId: string,
        listId: string,
        items: ReadonlyArray<components["schemas"]["ListItemCreate"]>,
    ) => Promise<ReadonlyArray<components["schemas"]["ListItem"]>>;
    updateItem: (
        userId: string,
        listId: string,
        itemId: string,
        item: components["schemas"]["ListItemUpdate"],
    ) => Promise<components["schemas"]["ListItem"]>;
    moveItems: (
        userId: string,
        listId: string,
        itemIds: ReadonlyArray<string>,
        destinationListId: string,
    ) => Promise<ReadonlyArray<components["schemas"]["ListItem"]>>;
    deleteItem: (
        userId: string,
        listId: string,
        itemId: string,
    ) => Promise<void>;
    getMembers: (
        userId: string,
        listId: string,
    ) => Promise<ReadonlyArray<components["schemas"]["Member"]>>;
    inviteMember: (
        userId: string,
        listId: string,
        targetUserId: string,
    ) => Promise<void>;
    updateMember: (
        userId: string,
        listId: string,
        memberId: string,
        status: components["schemas"]["MemberUpdateStatus"],
    ) => Promise<components["schemas"]["Member"]>;
    removeMember: (
        userId: string,
        listId: string,
        memberId: string,
    ) => Promise<void>;
    leaveList: (userId: string, listId: string) => Promise<void>;
    acceptInvite: (userId: string, listId: string) => Promise<void>;
    declineInvite: (userId: string, listId: string) => Promise<void>;
}

export const createListService = createService<ListService, "listRepository">(
    ({ listRepository }) => ({
        getAll: async (userId) => {
            const { lists } = await listRepository.readAll({ userId });
            if (lists.length === 0) {
                return [];
            }

            const listIds = lists.map(({ listId }) => ({ listId }));
            const counts = await listRepository.countOutstandingItems(listIds);
            const timestamps =
                await listRepository.getLatestUpdatedTimestamp(listIds);

            const countMap = new Map(counts.map((c) => [c.listId, c.count]));
            const timestampMap = new Map(
                timestamps.map((t) => [t.listId, t.updatedAt]),
            );

            return lists.map((list) => ({
                ...list,
                outstandingItemCount: countMap.get(list.listId) ?? 0,
                lastUpdated: timestampMap.get(list.listId),
            }));
        },
        get: async (userId, listId) => {
            const {
                lists: [list],
            } = await listRepository.read({
                userId,
                lists: [{ listId }],
            });

            if (!list) {
                throw new NotFoundError("list", listId);
            }

            return list;
        },
        create: async (userId, request) => {
            const { lists } = await listRepository.create({
                userId,
                lists: [request],
            });

            const [list] = lists;

            if (!list) {
                throw new CreatedDataFetchError("list");
            }

            return list;
        },
        update: async (userId, listId, request) => {
            const permissions = await listRepository.verifyPermissions({
                userId,
                lists: [{ listId }],
                status: "O",
            });

            if (
                permissions.lists.some(({ hasPermissions }) => !hasPermissions)
            ) {
                throw new NotFoundError("list", listId);
            }

            const { lists } = await listRepository.update({
                userId,
                lists: [{ ...request, listId }],
            });

            const [list] = lists;
            if (!list) {
                throw new UpdatedDataFetchError("list", listId);
            }

            return list;
        },
        delete: async (userId, listId) => {
            const permissions = await listRepository.verifyPermissions({
                userId,
                lists: [{ listId }],
                status: "O",
            });

            if (
                permissions.lists.some(({ hasPermissions }) => !hasPermissions)
            ) {
                throw new NotFoundError("list", listId);
            }

            await listRepository.delete({ lists: [{ listId }] });
        },
        getItems: async (userId, listId) => {
            const permissions = await listRepository.verifyPermissions({
                userId,
                lists: [{ listId }],
                status: ["O", "A", "M"],
            });

            if (
                permissions.lists.some(({ hasPermissions }) => !hasPermissions)
            ) {
                throw new NotFoundError("list", listId);
            }

            const { items } = await listRepository.readAllItems({
                userId,
                filter: { listId },
            });
            return items;
        },
        createItems: async (userId, listId, items) => {
            const permissions = await listRepository.verifyPermissions({
                userId,
                lists: [{ listId }],
                status: ["O", "A"],
            });

            if (
                permissions.lists.some(({ hasPermissions }) => !hasPermissions)
            ) {
                throw new NotFoundError("list", listId);
            }

            const { items: createdItems } = await listRepository.createItems({
                listId,
                userId,
                items,
            });

            return createdItems;
        },
        updateItem: async (userId, listId, itemId, request) => {
            const permissions = await listRepository.verifyPermissions({
                userId,
                lists: [{ listId }],
                status: ["O", "A"],
            });

            if (
                permissions.lists.some(({ hasPermissions }) => !hasPermissions)
            ) {
                throw new NotFoundError("list", listId);
            }

            const { items } = await listRepository.updateItems({
                listId,
                userId,
                items: [{ ...request, itemId }],
            });
            const [item] = items;
            if (!item) {
                throw new NotFoundError("list item", itemId);
            }

            return item;
        },
        moveItems: async (userId, listId, itemIds, destinationListId) => {
            if (listId === destinationListId) {
                throw new InvalidOperationError(
                    "list item",
                    "Cannot move items to the same list",
                );
            }

            const permissions = await listRepository.verifyPermissions({
                userId,
                lists: [{ listId }, { listId: destinationListId }],
                status: ["O", "A"],
            });

            const failedPermission = permissions.lists.find(
                ({ hasPermissions }) => !hasPermissions,
            );
            if (failedPermission) {
                throw new NotFoundError("list", failedPermission.listId);
            }

            const { items: currentItems } = await listRepository.readItems({
                userId,
                listId,
                items: itemIds.map((itemId) => ({ itemId })),
            });

            if (currentItems.length !== itemIds.length) {
                throw new NotFoundError(
                    "list item",
                    "One or more items not found in source list",
                );
            }

            const { items: movedItems } = await listRepository.moveItems({
                userId,
                listId: destinationListId,
                items: itemIds.map((itemId) => ({ itemId })),
            });

            if (movedItems.length !== itemIds.length) {
                throw new UpdatedDataFetchError(
                    "list item",
                    "Failed to retrieve moved items",
                );
            }

            return movedItems;
        },
        deleteItem: async (userId, listId, itemId) => {
            const permissions = await listRepository.verifyPermissions({
                userId,
                lists: [{ listId }],
                status: ["O", "A"],
            });

            if (
                permissions.lists.some(({ hasPermissions }) => !hasPermissions)
            ) {
                throw new NotFoundError("list", listId);
            }

            const { count } = await listRepository.deleteItems({
                listId,
                items: [{ itemId }],
            });

            if (count === 0) {
                throw new NotFoundError("list item", itemId);
            }
        },
        getMembers: async (userId, listId) => {
            const permissions = await listRepository.verifyPermissions({
                userId,
                lists: [{ listId }],
                status: "O",
            });

            if (
                permissions.lists.some(({ hasPermissions }) => !hasPermissions)
            ) {
                throw new NotFoundError("list", listId);
            }

            const [listMembers] = await listRepository.readMembers({
                listId,
            });

            if (!listMembers) {
                throw new NotFoundError("list", listId);
            }

            const { members } = listMembers;

            return members;
        },
        inviteMember: async (userId, listId, targetUserId) => {
            const permissions = await listRepository.verifyPermissions({
                userId,
                lists: [{ listId }],
                status: "O",
            });

            if (
                permissions.lists.some(({ hasPermissions }) => !hasPermissions)
            ) {
                throw new NotFoundError("list", listId);
            }

            const [currentMembers] = await listRepository.readMembers({
                listId,
            });
            if (
                currentMembers?.members.some((m) => m.userId === targetUserId)
            ) {
                throw new InvalidOperationError(
                    "list member",
                    "User is already a member",
                );
            }

            try {
                await listRepository.saveMembers({
                    listId,
                    members: [{ userId: targetUserId, status: "P" }],
                });
            } catch (error: unknown) {
                if (error instanceof ForeignKeyViolationError) {
                    throw new NotFoundError("user", targetUserId);
                }
                throw error;
            }
        },
        updateMember: async (userId, listId, memberId, status) => {
            const permissions = await listRepository.verifyPermissions({
                userId,
                lists: [{ listId }],
                status: "O",
            });

            if (
                permissions.lists.some(({ hasPermissions }) => !hasPermissions)
            ) {
                throw new NotFoundError("list", listId);
            }

            const [currentListMembers] = await listRepository.readMembers({
                listId,
            });
            const currentMember = currentListMembers?.members.find(
                (m) => m.userId === memberId,
            );

            if (!currentMember) {
                throw new NotFoundError("list member", memberId);
            }

            if (currentMember.status === "P") {
                throw new InvalidOperationError(
                    "list member",
                    "Cannot update a pending member",
                );
            }

            await listRepository.saveMembers({
                listId,
                members: [{ userId: memberId, status }],
            });

            const [listMembers] = await listRepository.readMembers({
                listId,
            });

            const member = listMembers?.members.find(
                (m) => m.userId === memberId,
            );

            if (!member) {
                throw new NotFoundError("list member", memberId);
            }

            return member;
        },
        removeMember: async (userId, listId, memberId) => {
            const permissions = await listRepository.verifyPermissions({
                userId,
                lists: [{ listId }],
                status: "O",
            });

            if (
                permissions.lists.some(({ hasPermissions }) => !hasPermissions)
            ) {
                throw new NotFoundError("list", listId);
            }

            if (memberId === userId) {
                throw new InvalidOperationError(
                    "list member",
                    "Cannot remove self from list",
                );
            }

            await listRepository.removeMembers({
                listId,
                members: [{ userId: memberId }],
            });
        },
        leaveList: async (userId, listId) => {
            const permissions = await listRepository.verifyPermissions({
                userId,
                lists: [{ listId }],
                status: ["A", "M"],
            });
            if (
                permissions.lists.some(({ hasPermissions }) => !hasPermissions)
            ) {
                throw new NotFoundError("list", listId);
            }

            await listRepository.removeMembers({
                listId,
                members: [{ userId }],
            });
        },
        acceptInvite: async (userId, listId) => {
            const permissions = await listRepository.verifyPermissions({
                userId,
                lists: [{ listId }],
                status: "P",
            });

            if (
                permissions.lists.some(({ hasPermissions }) => !hasPermissions)
            ) {
                throw new NotFoundError("list", listId);
            }

            await listRepository.saveMembers({
                listId,
                members: [{ userId, status: "M" }],
            });
        },
        declineInvite: async (userId, listId) => {
            const permissions = await listRepository.verifyPermissions({
                userId,
                lists: [{ listId }],
                status: "P",
            });

            if (
                permissions.lists.some(({ hasPermissions }) => !hasPermissions)
            ) {
                throw new NotFoundError("list", listId);
            }

            await listRepository.removeMembers({
                listId,
                members: [{ userId }],
            });
        },
    }),
);
