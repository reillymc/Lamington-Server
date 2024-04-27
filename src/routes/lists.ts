import express from "express";

import { ListActions, ListItemActions, ListMemberActions } from "../controllers";
import {
    AppError,
    InsufficientDataError,
    MessageAction,
    NotFoundError,
    PermissionError,
    userMessage,
} from "../services";
import { prepareGetListResponseBody, validatePostListBody, validatePostListItemBody } from "./helpers";
import { validateListPermissions } from "./helpers/list";
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
    UserStatus,
} from "./spec";

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
            const results = await ListActions.ReadByUser({ userId });
            const outstandingItemCounts = await ListItemActions.CountOutstandingItems(results);
            const datesUpdated = await ListItemActions.ReadLatestUpdatedTimestamp(results);

            const outstandingItemsDict = Object.fromEntries(
                outstandingItemCounts.map(({ listId, count }) => [listId, count])
            );

            const datesUpdatedDict = Object.fromEntries(
                datesUpdated.map(({ listId, updatedAt }) => [listId, updatedAt])
            );

            const data: Lists = Object.fromEntries(
                results.map(list => [
                    list.listId,
                    prepareGetListResponseBody({
                        list,
                        userId,
                        outstandingItemCount: outstandingItemsDict[list.listId],
                        lastUpdated: datesUpdatedDict[list.listId],
                    }),
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

        if (!listId) return next(new InsufficientDataError("list"));

        // Fetch and return result
        try {
            const [list] = await ListActions.Read({ listId, userId });
            if (!list) return next(new NotFoundError("list", listId));

            const listItemsResponse = await ListItemActions.Read({ listId });
            const listMembersResponse = await ListMemberActions.read({ entityId: listId });

            const data = prepareGetListResponseBody({
                list,
                userId,
                listItems: listItemsResponse,
                members: listMembersResponse,
            });

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
            return next(new InsufficientDataError("list"));
        }

        // Update database and return status
        try {
            const { permissionsValid } = await validateListPermissions(
                validLists.map(({ listId }) => listId),
                userId,
                UserStatus.Owner
            );

            if (!permissionsValid) return next(new PermissionError("list"));

            await ListActions.Save(validLists);

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
        const { validListItems, invalidListItems, movedItems } = validatePostListItemBody(body, userId, listId);

        // Check all required fields are present
        if (!validListItems.length || invalidListItems.length) {
            return next(new InsufficientDataError("list item"));
        }

        // Update database and return status
        try {
            const { permissionsValid, missingLists } = await validateListPermissions(
                [listId, ...movedItems.map(({ listId }) => listId)],
                userId,
                UserStatus.Administrator
            );

            if (missingLists.length) return next(new NotFoundError("list", missingLists));

            if (!permissionsValid) return next(new PermissionError("list item"));

            await ListItemActions.Save(validListItems);

            if (movedItems.length) await ListItemActions.Delete(movedItems);

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
 * POST request to update a list member. Currently only used to accept self into a list.
 */
router.post<PostListMemberRequestParams, PostListMemberResponse, PostListMemberRequestBody>(
    ListEndpoint.postListMember,
    async ({ params, session }, res, next) => {
        // Extract request fields
        const { listId } = params;
        const { userId } = session;

        // Check all required fields are present
        if (!listId) return next(new InsufficientDataError("list member"));

        // Update database and return status
        try {
            const { permissionsValid, missingLists } = await validateListPermissions(
                listId,
                userId,
                UserStatus.Pending
            );

            if (missingLists.length) return next(new NotFoundError("list", missingLists));

            if (!permissionsValid) return next(new PermissionError("list member"));

            await ListMemberActions.save({ listId, members: [{ userId, status: UserStatus.Member }] });

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
        if (!listId) return next(new InsufficientDataError("list"));

        // Update database and return status
        try {
            const { permissionsValid, missingLists } = await validateListPermissions(listId, userId, UserStatus.Owner);

            if (missingLists.length) return next(new NotFoundError("list", missingLists));

            if (!permissionsValid) return next(new PermissionError("list"));

            await ListActions.Delete({ listId });
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
        if (!listId || !itemId) return next(new InsufficientDataError("list item"));

        // Update database and return status
        try {
            const { permissionsValid, missingLists } = await validateListPermissions(
                listId,
                userId,
                UserStatus.Administrator
            );

            if (missingLists.length) return next(new NotFoundError("list", missingLists));

            if (!permissionsValid) return next(new PermissionError("list item"));

            await ListItemActions.Delete({ listId, itemId });

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
        if (!userToDelete || !listId) return next(new InsufficientDataError("list member"));

        // Update database and return status
        try {
            const [existingList] = await ListActions.ReadPermissions([{ listId, userId }]);
            if (!existingList) return next(new NotFoundError("list", listId));

            if (userIdReq && userId !== userIdReq && existingList.createdBy !== userId) {
                return next(new PermissionError("list member"));
            }

            if (existingList.createdBy === userToDelete) {
                return next(
                    new AppError({
                        status: 400,
                        code: "OWNER",
                        message: "Cannot remove list owner from list.",
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
