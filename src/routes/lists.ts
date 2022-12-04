import express from "express";

import { AppError, MessageAction, userMessage } from "../services";
import { ListActions, InternalListActions } from "../controllers";
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
    GetListsRequest,
    GetListsRequestParams,
    GetListsResponse,
    List,
    ListEndpoints,
    Lists,
    PostListItemRequestBody,
    PostListItemRequestParams,
    PostListItemResponse,
    PostListRequestBody,
    PostListRequestParams,
    PostListResponse,
} from "./spec";

const router = express.Router();

/**
 * GET request to fetch all lists for a user
 */
router.get<GetListsRequestParams, GetListsResponse, GetListsRequest>(ListEndpoints.getLists, async (req, res, next) => {
    const { userId } = req.body;

    // Fetch and return result
    try {
        const results = await ListActions.readMy({ userId });
        const data: Lists = Object.fromEntries(
            results.map(list => [
                list.listId,
                { ...list, createdBy: { userId: list.createdBy, firstName: list.createdByName } },
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
});

/**
 * GET request to fetch list
 */
router.get<GetListRequestParams, GetListResponse, GetListRequestBody>(ListEndpoints.getList, async (req, res, next) => {
    // Extract request fields
    const { listId } = req.params;
    const { userId } = req.body;

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

        const listItemsResponse = await ListActions.readItems({ listId });
        const listMembersResponse = await ListActions.readMembers({ listId });

        const data: List = {
            ...list,
            createdBy: { userId: list.createdBy, firstName: list.createdByName },
            items: listItemsResponse.filter(item => item.listId === list.listId),
            members: Object.fromEntries(
                listMembersResponse.map(({ userId, canEdit, firstName, lastName }) => [
                    userId,
                    { userId, permissions: canEdit, firstName, lastName },
                ])
            ),
        };

        return res.status(200).json({ error: false, data });
    } catch (e: unknown) {
        next(new AppError({ innerError: e, message: userMessage({ action: MessageAction.Read, entity: "list" }) }));
    }
});

/**
 * POST request to create a list.
 */
router.post<PostListRequestParams, PostListResponse, PostListRequestBody>(
    ListEndpoints.postList,
    async (req, res, next) => {
        // Extract request fields
        const { userId, name, description, listId, memberIds = [] } = req.body;

        // Check all required fields are present
        if (!name) {
            return res.status(400).json({ error: true, message: "Insufficient data to create a list." });
        }

        // Update database and return status
        try {
            if (listId) {
                const [existingList] = await ListActions.read({ listId, userId });

                if (!existingList) {
                    return res.status(403).json({
                        error: true,
                        message: "Cannot find list to edit.",
                    });
                }

                if (existingList.createdBy !== userId) {
                    return res.status(403).json({
                        error: true,
                        message: "You do not have permissions to edit this list",
                    });
                }
            }

            await ListActions.create({
                listId,
                name,
                createdBy: userId,
                description,
                memberIds,
            });
            return res.status(201).json({ error: false, message: `List ${listId ? "updated" : "created"}` });
        } catch (e: unknown) {
            next(
                new AppError({
                    innerError: e,
                    message: userMessage({
                        action: listId ? MessageAction.Update : MessageAction.Create,
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
    ListEndpoints.postListItem,
    async (req, res, next) => {
        // Extract request fields
        const { listId } = req.params;

        const {
            userId,
            name,
            itemId,
            amount,
            completed = false,
            dateAdded = new Date().toISOString(),
            ingredientId,
            notes,
            unit,
        } = req.body;

        // Check all required fields are present
        if (!name || !listId) {
            return res.status(400).json({
                error: true,
                code: "LIST_INSUFFICIENT_DATA",
                message: "Insufficient data to create a list item.",
            });
        }

        // Update database and return status
        try {
            const [existingList] = await InternalListActions.readLists({ listId });

            if (!existingList) {
                return res.status(403).json({
                    error: true,
                    code: "LIST_NOT_FOUND",
                    message: "Cannot find list to add item to.",
                });
            }

            if (existingList.createdBy !== userId) {
                const existingListMembers = await ListActions.readMembers({ listId });

                if (!existingListMembers?.some(member => member.userId === userId && member.canEdit)) {
                    return res.status(403).json({
                        error: true,
                        code: "LIST_NO_PERMISSIONS",
                        message: "You do not have permissions to edit this list.",
                    });
                }
            }

            await ListActions.createItems({
                listId,
                name,
                completed,
                dateAdded: new Date(dateAdded).toISOString().slice(0, 19).replace("T", " "),
                itemId,
                amount,
                ingredientId,
                notes,
                unit,
                createdBy: userId,
            });
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
 * DELETE request to delete a list.
 */
router.delete<DeleteListRequestParams, DeleteListResponse, DeleteListRequestBody>(
    ListEndpoints.deleteList,
    async (req, res, next) => {
        // Extract request fields
        const {
            params: { listId },
            body: { userId },
        } = req;

        // Check all required fields are present
        if (!listId) {
            return res.status(400).json({ error: true, message: "Insufficient data to delete a list." });
        }

        // Update database and return status
        try {
            const [existingList] = await InternalListActions.readLists({ listId });

            if (!existingList) {
                return res.status(403).json({
                    error: true,
                    message: "Cannot find list to delete.",
                });
            }

            if (existingList.createdBy !== userId) {
                return res.status(403).json({
                    error: true,
                    message: "You do not have permissions to delete this list",
                });
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
    ListEndpoints.deleteListItem,
    async (req, res, next) => {
        // Extract request fields
        const { listId, itemId } = req.params;

        const { userId } = req.body;

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
            const [existingList] = await InternalListActions.readLists({ listId });
            if (!existingList) {
                return next(
                    new AppError({
                        status: 403,
                        message: "Cannot find list to delete item from.",
                    })
                );
            }
            if (existingList.createdBy !== userId) {
                const existingListMembers = await ListActions.readMembers({ listId });
                if (!existingListMembers?.some(member => member.userId === userId && member.canEdit)) {
                    return next(
                        new AppError({
                            status: 403,
                            message: "You do not have permissions to delete from this list",
                        })
                    );
                }
            }

            await ListActions.deleteItems({ listId, itemId });
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
    ListEndpoints.deleteListMember,
    async (req, res, next) => {
        // Extract request fields
        const { listId, userId: userIdReq } = req.params;

        const { userId } = req.body;

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
            const [existingList] = await InternalListActions.readLists({ listId });
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

            await ListActions.deleteMembers({ listId, userId: userToDelete });
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
