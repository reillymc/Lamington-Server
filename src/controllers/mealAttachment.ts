import type { Attachment } from "../database/definitions/attachment.ts";
import type { ContentAttachment } from "../database/definitions/contentAttachment.ts";
import type { Meal, CreateQuery, CreateResponse, KnexDatabase } from "../database/index.ts";
import db from "../database/index.ts";
import { EnsureArray } from "../utils/index.ts";
import { ContentAttachmentActions, type CreateContentAttachmentOptions } from "./content/contentAttachment.ts";

type SaveMealAttachmentRequest = CreateQuery<{
    mealId: Meal["mealId"];
    attachments: Array<{
        attachmentId: Attachment["attachmentId"];
        displayType: ContentAttachment["displayType"];
        displayId?: ContentAttachment["displayId"];
        displayOrder?: ContentAttachment["displayOrder"];
    }>;
}>;

type ReadMealAttachmentsRequest = CreateQuery<{
    mealId: Meal["mealId"];
}>;

type ReadMealAttachmentsResponse = {
    attachmentId: Attachment["attachmentId"];
    uri: Attachment["uri"];
    displayType: ContentAttachment["displayType"];
    displayId?: ContentAttachment["displayId"];
    displayOrder: ContentAttachment["displayOrder"];
    createdBy: Attachment["createdBy"];
    mealId: Meal["mealId"];
};

export const MealAttachmentActions = {
    read: (request: ReadMealAttachmentsRequest): CreateResponse<ReadMealAttachmentsResponse> =>
        ContentAttachmentActions.read(
            db as KnexDatabase,
            EnsureArray(request).map(({ mealId }) => ({ contentId: mealId }))
        ).then(response => response.map(({ contentId, ...rest }) => ({ mealId: contentId, ...rest }))),
    save: (request: SaveMealAttachmentRequest, options?: CreateContentAttachmentOptions) =>
        ContentAttachmentActions.save(
            db as KnexDatabase,
            EnsureArray(request).map(({ mealId, attachments }) => ({
                contentId: mealId,
                attachments,
            })),
            options
        ),
};

export type MealAttachmentActions = typeof MealAttachmentActions;
