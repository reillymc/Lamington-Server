import express from "express";

import {
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
    createdBy: string;
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
 * GET request to fetch all Lists
 * Does not require authentication
 */
router.get<never, ResponseBody<Lists>, AuthenticatedBody>("/", async (req, res, next) => {
    const { userId } = req.body;

    // Fetch and return result
    try {
        const results = await readMyLists({ userId });
        const data = Object.fromEntries(results.map(list => [list.listId, list]));

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
 * Does not require authentication
 */
router.get<ListRouteParams, ResponseBody<List>, AuthenticatedBody>("/:listId", async (req, res, next) => {
    // Extract request fields
    const { listId } = req.params;
    const { userId } = req.body;

    if (!listId) {
        return res.status(400).json({ error: true, message: "Insufficient data to fetch list." });
    }

    // Fetch and return result
    try {
        const [list] = await readLists({ listId, userId });
        if (!list) {
            return res.status(404).json({ error: true, message: "List not found." });
        }

        const listItemsResponse = await readListItems({ listId });

        const data: List = { ...list, items: listItemsResponse.filter(item => item.listId === list.listId) };

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
    const { userId, name, description, listId, members } = req.body;

    // Check all required fields are present
    if (!name) {
        return res.status(400).json({ error: true, message: "Insufficient data to create a list." });
    }

    const list: CreateListParams = {
        listId,
        name,
        createdBy: userId,
        description,
        members: members ?? [],
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
            return res.status(400).json({ error: true, message: "Insufficient data to create a list item." });
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
                    message: "Cannot find list to add item to.",
                });
            }
            if (existingList.createdBy !== userId) {
                const existingListMembers = await getListMembers({ listId });
                if (!existingListMembers?.some(member => member.userId === userId && member.canEdit)) {
                    console.log(existingListMembers, userId);
                    return res.status(403).json({
                        error: true,
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
            const existingListMembers = await getListMembers({ listId });
            if (!existingListMembers?.some(member => member.userId === userId && member.canEdit)) {
                console.log(existingListMembers, userId);
                return res.status(403).json({
                    error: true,
                    message: "You do not have permissions to delete this list",
                });
            }
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
            return res.status(400).json({ error: true, message: "Insufficient data to delete a list item." });
        }

        // Update database and return status
        try {
            const [existingList] = await InternalListActions.readLists({ listId });
            if (!existingList) {
                return res.status(403).json({
                    error: true,
                    message: "Cannot find list to delete item from.",
                });
            }
            if (existingList.createdBy !== userId) {
                const existingListMembers = await getListMembers({ listId });
                if (!existingListMembers?.some(member => member.userId === userId && member.canEdit)) {
                    console.log(existingListMembers, userId);
                    return res.status(403).json({
                        error: true,
                        message: "You do not have permissions to delete from this list",
                    });
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

export default router;
