import express from "express";
import { v4 as Uuid } from "uuid";

import { AppError, MessageAction, userMessage } from "../services";
import { ListActions, InternalListActions, ListItemActions, ListMemberActions } from "../controllers";
import {
    DeleteListItemRequestBody,
    DeleteListItemRequestParams,
    DeleteListItemResponse,
    DeleteListMemberRequestBody,
    DeleteListMemberRequestParams,
    DeleteListMemberResponse,
    DeleteListRequestBody,
    DeleteListRequestParams,
    DeleteListResponse,
    GetListRequestBody,
    GetListRequestParams,
    GetListResponse,
    GetListsRequestBody,
    GetListsRequestParams,
    GetListsResponse,
    List,
    ListEndpoint,
    Lists,
    PostListItemRequestBody,
    PostListItemRequestParams,
    PostListItemResponse,
    PostListMemberRequestBody,
    PostListMemberRequestParams,
    PostListMemberResponse,
    PostListRequestBody,
    PostListRequestParams,
    PostListResponse,
} from "./spec";
import { BisectOnValidItems, EnsureDefinedArray } from "../utils";
import { ServiceParams } from "../database";

const router = express.Router();

/**
 * GET request to fetch all lists for a user
 */
router.get<GetListsRequestParams, GetListsResponse, GetListsRequestBody>(
    ListEndpoint.getLists,
    async ({ session }, res, next) => {
        const { userId } = session;

        // Fetch and return result
        try {
            const results = await ListActions.readMy({ userId });
            const outstandingItemCounts = await ListItemActions.countOutstandingItems(
                results.map(({ listId }) => ({ listId }))
            );

            const data: Lists = Object.fromEntries(
                results.map(list => [
                    list.listId,
                    {
                        ...list,
                        outstandingItemCount: outstandingItemCounts.find(({ listId }) => listId === list.listId)?.count,
                        createdBy: { userId: list.createdBy, firstName: list.createdByName },
                        accepted: list.createdBy === userId ? true : !!list.accepted,
                    },
                ])
            );

            return res.status(200).json({ error: false, data });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({ action: MessageAction.Read, entity: "lists" }),
                })
            );
        }
    }
);

/**
 * GET request to fetch list
 */
router.get<GetListRequestParams, GetListResponse, GetListRequestBody>(
    ListEndpoint.getList,
    async ({ params, session }, res, next) => {
        // Extract request fields
        const { listId } = params;
        const { userId } = session;

        if (!listId) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to remove list member.",
                })
            );
        }

        // Fetch and return result
        try {
            const [list] = await ListActions.read({ listId, userId });
            if (!list) {
                return next(
                    new AppError({
                        status: 404,
                        code: "NOT_FOUND",
                        message: "Could not find list.",
                    })
                );
            }

            const listItemsResponse = await ListItemActions.read({ listId });
            const listMembersResponse = await ListMemberActions.read({ entityId: listId });

            const data: List = {
                ...list,
                createdBy: { userId: list.createdBy, firstName: list.createdByName },
                items: listItemsResponse.filter(item => item.listId === list.listId),
                members: Object.fromEntries(
                    listMembersResponse.map(({ userId, canEdit, firstName, lastName }) => [
                        userId,
                        { userId, allowEditing: !!canEdit, firstName, lastName },
                    ])
                ),
                accepted:
                    list.createdBy === userId
                        ? true
                        : !!listMembersResponse.find(({ userId }) => userId === userId)?.accepted,
            };

            return res.status(200).json({ error: false, data });
        } catch (e: unknown) {
            next(new AppError({ innerError: e, message: userMessage({ action: MessageAction.Read, entity: "list" }) }));
        }
    }
);

/**
 * POST request to create a list.
 */
router.post<PostListRequestParams, PostListResponse, PostListRequestBody>(
    ListEndpoint.postList,
    async ({ body, session }, res, next) => {
        // Extract request fields
        const { userId } = session;
        const [validLists, invalidLists] = validatePostListBody(body, userId);

        // Check all required fields are present
        if (!validLists.length || invalidLists.length) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to create a list.",
                })
            );
        }

        // Update database and return status
        try {
            const existingLists = await InternalListActions.read(validLists);

            if (existingLists.some(list => list.createdBy !== userId)) {
                return next(
                    new AppError({
                        status: 403,
                        code: "RECIPE_NO_PERMISSIONS",
                        message: "You do not have permissions to edit this list.",
                    })
                );
            }

            await ListActions.save(validLists);
            return res.status(201).json({ error: false, message: `List saved` });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({
                        action: MessageAction.Save,
                        entity: "list",
                    }),
                })
            );
        }
    }
);

/**
 * POST request to create a list item.
 */
router.post<PostListItemRequestParams, PostListItemResponse, PostListItemRequestBody>(
    ListEndpoint.postListItem,
    async ({ body, params, session }, res, next) => {
        // Extract request fields
        const { listId } = params;
        const { userId } = session;
        const [validListItems, invalidListItems] = validatePostListItemBody(body, userId, listId);

        // Check all required fields are present
        if (!validListItems.length || invalidListItems.length) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to save a book.",
                })
            );
        }

        // Update database and return status
        try {
            const [existingList] = await InternalListActions.read({ listId });

            if (!existingList) {
                return next(
                    new AppError({
                        status: 403,
                        code: "LIST_NOT_FOUND",
                        message: "Cannot find list to add item to.",
                    })
                );
            }

            if (existingList.createdBy !== userId) {
                const existingListMembers = await ListMemberActions.read({ entityId: listId });

                if (!existingListMembers?.some(member => member.userId === userId && member.canEdit)) {
                    return next(
                        new AppError({
                            status: 403,
                            code: "LIST_NO_PERMISSIONS",
                            message: "You do not have permissions to edit this list.",
                        })
                    );
                }
            }

            await ListItemActions.save(validListItems);
            return res.status(201).json({ error: false, message: "List item added." });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({
                        action: listId ? MessageAction.Update : MessageAction.Create,
                        entity: "list item",
                    }),
                })
            );
        }
    }
);

/**
 * POST request to update a list member.
 */
router.post<PostListMemberRequestParams, PostListMemberResponse, PostListMemberRequestBody>(
    ListEndpoint.postListMember,
    async ({ body, params, session }, res, next) => {
        // Extract request fields
        const { listId } = params;
        const { accepted } = body;
        const { userId } = session;

        // Check all required fields are present
        if (!listId) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to update list member.",
                })
            );
        }

        // Update database and return status
        try {
            const [existingList] = await InternalListActions.read({ listId });
            if (!existingList) {
                return next(
                    new AppError({
                        status: 403,
                        code: "NOT_FOUND",
                        message: "Cannot find list to edit membership for.",
                    })
                );
            }

            const listMembers = await ListMemberActions.read({ entityId: listId });

            if (!listMembers?.some(member => member.userId === userId)) {
                return next(
                    new AppError({
                        status: 403,
                        code: "NO_PERMISSIONS",
                        message: "You are not a member of this list.",
                    })
                );
            }

            await ListMemberActions.save({ listId, members: [{ userId, accepted }] });
            return res.status(201).json({ error: false, message: "List member removed." });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({
                        action: MessageAction.Delete,
                        entity: "list member",
                    }),
                })
            );
        }
    }
);

/**
 * DELETE request to delete a list.
 */
router.delete<DeleteListRequestParams, DeleteListResponse, DeleteListRequestBody>(
    ListEndpoint.deleteList,
    async ({ params, session }, res, next) => {
        // Extract request fields
        const { listId } = params;
        const { userId } = session;

        // Check all required fields are present
        if (!listId) {
            return next(
                new AppError({
                    status: 400,
                    message: "Insufficient data to delete a list.",
                })
            );
        }

        // Update database and return status
        try {
            const [existingList] = await InternalListActions.read({ listId });

            if (!existingList) {
                return next(
                    new AppError({
                        status: 403,
                        message: "Cannot find list to delete.",
                    })
                );
            }

            if (existingList.createdBy !== userId) {
                return next(
                    new AppError({
                        status: 403,
                        message: "You do not have permissions to delete this list",
                    })
                );
            }

            await ListActions.delete({ listId });
            return res.status(201).json({ error: false, message: "List deleted." });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({ action: MessageAction.Delete, entity: "list item" }),
                })
            );
        }
    }
);

/**
 * DELETE request to delete a list item.
 */
router.delete<DeleteListItemRequestParams, DeleteListItemResponse, DeleteListItemRequestBody>(
    ListEndpoint.deleteListItem,
    async ({ params, session }, res, next) => {
        // Extract request fields
        const { listId, itemId } = params;
        const { userId } = session;

        // Check all required fields are present
        if (!listId || !itemId) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to remove list member.",
                })
            );
        }

        // Update database and return status
        try {
            const [existingList] = await InternalListActions.read({ listId });
            if (!existingList) {
                return next(
                    new AppError({
                        status: 403,
                        message: "Cannot find list to delete item from.",
                    })
                );
            }
            if (existingList.createdBy !== userId) {
                const existingListMembers = await ListMemberActions.read({ entityId: listId });

                if (!existingListMembers?.some(member => member.userId === userId && member.canEdit)) {
                    return next(
                        new AppError({
                            status: 403,
                            message: "You do not have permissions to delete from this list",
                        })
                    );
                }
            }

            await ListItemActions.delete({ listId, itemId });
            return res.status(201).json({ error: false, message: "List item deleted." });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({ action: MessageAction.Delete, entity: "list item" }),
                })
            );
        }
    }
);

/**
 * DELETE request to delete a list member.
 */
router.delete<DeleteListMemberRequestParams, DeleteListMemberResponse, DeleteListMemberRequestBody>(
    ListEndpoint.deleteListMember,
    async ({ params, session }, res, next) => {
        // Extract request fields
        const { listId, userId: userIdReq } = params;
        const { userId } = session;

        const userToDelete = userIdReq || userId;

        // Check all required fields are present
        if (!userToDelete || !listId) {
            return next(
                new AppError({
                    status: 400,
                    code: "INSUFFICIENT_DATA",
                    message: "Insufficient data to remove list member.",
                })
            );
        }

        // Update database and return status
        try {
            const [existingList] = await InternalListActions.read({ listId });
            if (!existingList) {
                return next(
                    new AppError({
                        status: 403,
                        code: "NOT_FOUND",
                        message: "Cannot find list to remove member from.",
                    })
                );
            }

            if (existingList.createdBy === userToDelete) {
                return next(
                    new AppError({
                        status: 403,
                        code: "OWNER",
                        message: "You cannot leave a list you own.",
                    })
                );
            }

            if (userIdReq && userId !== userIdReq && existingList.createdBy !== userId) {
                return next(
                    new AppError({
                        status: 403,
                        code: "NO_PERMISSIONS",
                        message: "You do not have permissions to remove list member.",
                    })
                );
            }

            await ListMemberActions.delete({ entityId: listId, userId: userToDelete });
            return res.status(201).json({ error: false, message: "List member removed." });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({
                        action: MessageAction.Delete,
                        entity: "list member",
                    }),
                })
            );
        }
    }
);

export default router;

const validatePostListBody = ({ data }: PostListRequestBody, userId: string) => {
    const filteredData = EnsureDefinedArray(data);

    return BisectOnValidItems(filteredData, ({ listId = Uuid(), name, ...item }) => {
        if (!name) return;

        const validItem: ServiceParams<ListActions, "save"> = {
            listId,
            name,
            description: item.description,
            members: item.members,
            createdBy: userId,
        };

        return validItem;
    });
};

const validatePostListItemBody = ({ data }: PostListItemRequestBody, userId: string, listId: string) => {
    const filteredData = EnsureDefinedArray(data);

    return BisectOnValidItems(filteredData, ({ itemId = Uuid(), name, ...item }) => {
        if (!name) return;

        const parsedDate = item.dateAdded ? new Date(item.dateAdded) : new Date();

        const validItem: ServiceParams<ListItemActions, "save"> = {
            itemId,
            listId,
            name,
            amount: item.amount,
            completed: item.completed ?? false,
            dateAdded: parsedDate.toISOString().slice(0, 19).replace("T", " "),
            ingredientId: item.ingredientId,
            notes: item.notes,
            unit: item.unit,
            createdBy: userId,
        };

        return validItem;
    });
};
