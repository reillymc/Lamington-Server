import express, { Request } from "express";

import { AuthTokenData, checkToken, verifyToken } from "../../authentication/auth";
import {
    createLists,
    CreateListParams,
    readAllLists,
    readLists,
    getListMembers,
    readListItems,
    createListItems,
    CreateListItemParams,
    InternalListActions,
    deleteListItems,
} from "../../database/actions/list";
import { LamingtonAuthenticatedRequest, LamingtonDataResponse } from "../response";
import { List, Lists } from "../specification";
import { InternalErrorResponse, UnauthenticatedResponse } from "./helper";

const router = express.Router();

type GetListsRequest = Request<{}, LamingtonDataResponse<List[]>, AuthTokenData, null>;
type GetListsResponse = LamingtonDataResponse<Lists>;

/**
 * GET request to fetch all Lists
 * Does not require authentication
 */
router.get("/", checkToken, async (req: GetListsRequest, res: GetListsResponse) => {
    // Fetch and return result
    try {
        const results = await readAllLists();
        const data = Object.fromEntries(results.map(list => [list.listId, list]));

        return res.status(200).json({ error: false, data });
    } catch (exception: unknown) {
        return res.status(500).json({ error: true, message: "Error fetching data." + exception });
    }
});

interface GetListParams {
    listId: string;
    creatorId: string;
}

type GetListRequest = Request<GetListParams, LamingtonDataResponse<List>, AuthTokenData, null>;
type GetListResponse = LamingtonDataResponse<List>;

/**
 * GET request to fetch list
 * Does not require authentication
 */
router.get("/:listId", checkToken, async (req: GetListRequest, res: GetListResponse) => {
    // Extract request fields
    const { listId } = req.params;
    const { userId } = req.body; // TODO only fetch if list is created by userId, or userId is in listMembers

    if (!listId) {
        return res.status(400).json({ error: true, message: "Insufficient data to create list" });
    }

    // Fetch and return result
    try {
        const [list] = await readLists({ listId });
        const listItemsResponse = await readListItems({ listId });

        const data: List = { ...list, items: listItemsResponse.filter(item => item.listId === list.listId) };

        return res.status(200).json({ error: false, data });
    } catch (exception: unknown) {
        return res.status(500).json({ error: true, message: "Error fetching data." + exception });
    }
});

type CreateListRequest = LamingtonAuthenticatedRequest<CreateListParams>;
type CreateListResponse = LamingtonDataResponse<List>;

/**
 * POST request to create a list.
 */
router.post("/", verifyToken, async (req: CreateListRequest, res: CreateListResponse) => {    
    // Extract request fields
    const { userId, name, description, listId } = req.body;

    // Check all required fields are present
    if (!userId) return UnauthenticatedResponse(res);

    if (!name) {
        return res.status(400).json({ error: true, message: "Insufficient data to create list" });
    }

    const list: CreateListParams = {
        listId,
        name,
        createdBy: userId,
        description,
    };

    // Update database and return status
    try {
        if (!listId) {
            await createLists(list);
            return res.status(201).json({ error: false, message: `Recipe created` });
        } else {
            const [existingList] = await readLists({ listId });
            const existingListMembers = await getListMembers({ listId });
            if (!existingList) {
                return res.status(403).json({
                    error: true,
                    message: `Cannot find list to edit`,
                });
            }
            if (!existingListMembers?.some(member => member.userId === userId && member.canEdit)) {
                return res.status(403).json({
                    error: true,
                    message: `Cannot edit a list that doesn't belong to you`,
                });
            }
            await createLists(list);
            return res.status(201).json({ error: false, message: `Recipe updated` });
        }
    } catch (exception: unknown) {
        console.log("List Post Error: ", exception);
        return InternalErrorResponse(res, exception);
    }
});

interface PostListItemParams {
    listId: string;
}

interface PostListItemBody {
    name: string;
    itemId?: string;
    dateAdded?: string;
    completed?: boolean;
    ingredientId?: string;
    unit?: string;
    amount?: number;
    notes?: string;
}

type PostListItemRequest = LamingtonAuthenticatedRequest<PostListItemBody, PostListItemParams>;

/**
 * POST request to create a list item.
 */
router.post("/:listId/items", verifyToken, async (req: PostListItemRequest, res: any) => {
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
    if (!userId) return UnauthenticatedResponse(res);

    if (!name || !listId) {
        return res.status(400).json({ error: true, message: "Insufficient data to create list item" });
    }

    const listItem: CreateListItemParams = {
        listId,
        name,
        completed,
        dateAdded: new Date(dateAdded).toISOString().slice(0, 19).replace('T', ' '),
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
                message: `Cannot find list to edit`,
            });
        }
        if (existingList.createdBy !== userId) {
            const existingListMembers = await getListMembers({ listId });
            if (!existingListMembers?.some(member => member.userId === userId && member.canEdit)) {
                console.log(existingListMembers, userId);
                return res.status(403).json({
                    error: true,
                    message: `You do not have permissions to edit this list`,
                });
            }
        }

        await createListItems(listItem);
        return res.status(201).json({ error: false, message: `List item added` });
    } catch (exception: unknown) {
        console.log(exception);
        return InternalErrorResponse(res, exception);
    }
});

interface DeleteListItemParams {
    listId: string;
    itemId: string;
}

interface DeleteListItemBody {

}

type DeleteListItemRequest = LamingtonAuthenticatedRequest<DeleteListItemBody, DeleteListItemParams>;

/**
 * DELETE request to delete a list item.
 */
router.delete("/:listId/items/:itemId", verifyToken, async (req: DeleteListItemRequest, res: any) => {
    // Extract request fields
    const { listId, itemId } = req.params;

    const { userId } = req.body;

    // Check all required fields are present
    if (!userId) return UnauthenticatedResponse(res);

    if (!listId || !listId) {
        return res.status(400).json({ error: true, message: "Insufficient data to delete a list item" });
    }

    const listItem: DeleteListItemParams = {
        listId,
        itemId,
    };

    // Update database and return status
    try {
        const [existingList] = await InternalListActions.readLists({ listId });
        if (!existingList) {
            return res.status(403).json({
                error: true,
                message: `Cannot find list to edit`,
            });
        }
        if (existingList.createdBy !== userId) {
            const existingListMembers = await getListMembers({ listId });
            if (!existingListMembers?.some(member => member.userId === userId && member.canEdit)) {
                console.log(existingListMembers, userId);
                return res.status(403).json({
                    error: true,
                    message: `You do not have permissions to edit this list`,
                });
            }
        }

        await deleteListItems(listItem);
        return res.status(201).json({ error: false, message: `List item added` });
    } catch (exception: unknown) {
        console.log(exception);
        return InternalErrorResponse(res, exception);
    }
});


export default router;
