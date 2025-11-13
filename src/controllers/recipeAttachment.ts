import type { Attachment } from "../database/definitions/attachment.ts";
import type { ContentAttachment } from "../database/definitions/contentAttachment.ts";
import type { Recipe, CreateQuery, CreateResponse } from "../database/index.ts";
import { EnsureArray } from "../utils/index.ts";
import { ContentAttachmentActions, type CreateContentAttachmentOptions } from "./content/contentAttachment.ts";

type SaveRecipeAttachmentRequest = CreateQuery<{
    recipeId: Recipe["recipeId"];
    attachments: Array<{
        attachmentId?: Attachment["attachmentId"];
        displayType: ContentAttachment["displayType"];
        displayId?: ContentAttachment["displayId"];
        displayOrder?: ContentAttachment["displayOrder"];
    }>;
}>;

type ReadRecipeAttachmentsRequest = CreateQuery<{
    recipeId: Recipe["recipeId"];
}>;

type ReadRecipeAttachmentsResponse = {
    attachmentId: Attachment["attachmentId"];
    uri: Attachment["uri"];
    displayType: ContentAttachment["displayType"];
    displayId?: ContentAttachment["displayId"];
    displayOrder: ContentAttachment["displayOrder"];
    createdBy: Attachment["createdBy"];
    recipeId: Recipe["recipeId"];
};

export const RecipeAttachmentActions = {
    read: (request: ReadRecipeAttachmentsRequest): CreateResponse<ReadRecipeAttachmentsResponse> =>
        ContentAttachmentActions.read(EnsureArray(request).map(({ recipeId }) => ({ contentId: recipeId }))).then(
            response => response.map(({ contentId, ...rest }) => ({ recipeId: contentId, ...rest }))
        ),
    save: (request: SaveRecipeAttachmentRequest, options?: CreateContentAttachmentOptions) =>
        ContentAttachmentActions.save(
            EnsureArray(request).map(({ recipeId, attachments }) => ({
                contentId: recipeId,
                attachments,
            })),
            options
        ),
};

export type RecipeAttachmentActions = typeof RecipeAttachmentActions;
