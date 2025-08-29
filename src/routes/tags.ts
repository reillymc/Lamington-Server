import express from "express";

import { TagActions } from "../controllers/index.ts";
import { AppError, MessageAction, userMessage } from "../services/index.ts";
import type { GetTagsRequestBody, GetTagsRequestParams, GetTagsResponse, TagGroups } from "./spec/index.ts";

const router = express.Router();

/**
 * GET request to fetch all tags
 */
router.get<GetTagsRequestParams, GetTagsResponse, GetTagsRequestBody>("/", async (req, res, next) => {
    try {
        const result = await TagActions.readAll();

        const parents = result.filter(row => row.parentId === null);
        const children = result.filter(row => row.parentId !== null);

        const data = parents.reduce((acc, parent) => {
            const childrenOfParent = children.filter(child => child.parentId === parent.tagId);

            acc[parent.tagId] = {
                tagId: parent.tagId,
                name: parent.name,
                description: parent.description,
                tags: Object.fromEntries(
                    childrenOfParent.map(child => [
                        child.tagId,
                        { tagId: child.tagId, name: child.name, description: child.description },
                    ])
                ),
            };

            return acc;
        }, {} as TagGroups);

        return res.status(200).json({ error: false, data });
    } catch (e: unknown) {
        next(
            new AppError({ innerError: e, message: userMessage({ action: MessageAction.Read, entity: "categories" }) })
        );
    }
});

export default router;
