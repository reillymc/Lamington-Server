import express from "express";

import ListActions, {
    createLists,
    CreateListParams,
    readLists,
    getListMembers,
    readListItems,
    createListItems,
    CreateListItemParams,
    InternalListActions,
    deleteListItems,
    readMyLists,
    deleteLists,
} from "../controllers/list";
import { AppError, MessageAction, userMessage } from "../services";
import { AuthenticatedBody } from "../middleware";
import { ResponseBody } from "../spec";
import { User } from "./users";

const router = express.Router();

/**
 * Lists
 */
export type Lists = {
    [listId: string]: List;
};

/**
 * List
 */
export type List = {
    listId: string;
    name: string;
    createdBy: Pick<User, "userId" | "firstName">;
    description: string | undefined;
    items?: Array<ListItem>;
};

/**
 * ListItem
 */
export type ListItem = {
    itemId: string;
    name: string;
    dateAdded: string;
    completed: boolean;
    ingredientId?: string;
    unit?: string;
    amount?: number;
    notes?: string;
};

interface ListRouteParams {
    listId?: string;
}

/**
 * GET request to fetch all lists for a user
 */
router.get<never, ResponseBody<Lists>, AuthenticatedBody>("/", async (req, res, next) => {
    const { userId } = req.body;

    // Fetch and return result
    try {
        const results = await readMyLists({ userId });
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

interface GetListResponse extends List {
    members?: {
        [userId: string]: {
            userId: string;
            firstName?: string;
            lastName?: string;
            permissions?: string;
        };
    };
}

/**
 * GET request to fetch list
 */
router.get<ListRouteParams, ResponseBody<GetListResponse>, AuthenticatedBody>("/:listId", async (req, res, next) => {
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
        const [list] = await readLists({ listId, userId });
        if (!list) {
            return next(
                new AppError({
                    status: 404,
                    code: "NOT_FOUND",
                    message: "Could not find list.",
                })
            );
        }

        const listItemsResponse = await readListItems({ listId });
        const listMembersResponse = await ListActions.readListMembers({ listId });

        const data: GetListResponse = {
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

        console.log(data);

        return res.status(200).json({ error: false, data });
    } catch (e: unknown) {
        next(new AppError({ innerError: e, message: userMessage({ action: MessageAction.Read, entity: "list" }) }));
    }
});

/**
 * POST request to create a list.
 */
router.post<ListRouteParams, ResponseBody, AuthenticatedBody<CreateListParams>>("/", async (req, res, next) => {
    // Extract request fields
    const { userId, name, description, listId, memberIds = [] } = req.body;

    // Check all required fields are present
    if (!name) {
        return res.status(400).json({ error: true, message: "Insufficient data to create a list." });
    }

    const list: CreateListParams = {
        listId,
        name,
        createdBy: userId,
        description,
        memberIds,
    };

    // Update database and return status
    try {
        if (!listId) {
            await createLists(list);
            return res.status(201).json({ error: false, message: `List created.` });
        } else {
            const [existingList] = await readLists({ listId, userId });
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
            await createLists(list);
            return res.status(201).json({ error: false, message: "List updated" });
        }
    } catch (e: unknown) {
        next(
            new AppError({
                innerError: e,
                message: userMessage({ action: listId ? MessageAction.Update : MessageAction.Create, entity: "list" }),
            })
        );
    }
});

interface PostListItemBody {
    name?: string;
    itemId?: string;
    dateAdded?: string;
    completed?: boolean;
    ingredientId?: string;
    unit?: string;
    amount?: number;
    notes?: string;
}

/**
 * POST request to create a list item.
 */
router.post<ListRouteParams, ResponseBody, AuthenticatedBody<PostListItemBody>>(
    "/:listId/items",
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

        const listItem: CreateListItemParams = {
            listId,
            name,
            completed,
            dateAdded: new Date(dateAdded).toISOString().slice(0, 19).replace("T", " "),
            itemId,
            amount,
            ingredientId,
            notes,
            unit,
        };

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
                const existingListMembers = await getListMembers({ listId });
                if (!existingListMembers?.some(member => member.userId === userId && member.canEdit)) {
                    console.log(existingListMembers, userId);
                    return res.status(403).json({
                        error: true,
                        code: "LIST_NO_PERMISSIONS",
                        message: "You do not have permissions to edit this list.",
                    });
                }
            }

            await createListItems(listItem);
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
router.delete<ListRouteParams, ResponseBody, AuthenticatedBody>("/:listId", async (req, res, next) => {
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

        await deleteLists({ listId });
        return res.status(201).json({ error: false, message: "List deleted." });
    } catch (e: unknown) {
        next(
            new AppError({
                innerError: e,
                message: userMessage({ action: MessageAction.Delete, entity: "list item" }),
            })
        );
    }
});

interface DeleteListItemParams extends ListRouteParams {
    itemId?: string;
}

/**
 * DELETE request to delete a list item.
 */
router.delete<DeleteListItemParams, ResponseBody, AuthenticatedBody>(
    "/:listId/items/:itemId",
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
                const existingListMembers = await getListMembers({ listId });
                if (!existingListMembers?.some(member => member.userId === userId && member.canEdit)) {
                    console.log(existingListMembers, userId);
                    return next(
                        new AppError({
                            status: 403,
                            message: "You do not have permissions to delete from this list",
                        })
                    );
                }
            }

            await deleteListItems({ listId, itemId });
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

interface DeleteListMemberParams extends ListRouteParams {
    userId?: string;
}

/**
 * DELETE request to delete a list member.
 */
router.delete<DeleteListMemberParams, ResponseBody, AuthenticatedBody>("/:listId/members", async (req, res, next) => {
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

        await ListActions.deleteListMembers({ listId, userId: userToDelete });
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
});

export default router;
