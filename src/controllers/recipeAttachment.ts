import type { Attachment } from "../database/definitions/attachment.ts";
import type { ContentAttachment } from "../database/definitions/contentAttachment.ts";
import type { Recipe } from "../database/definitions/recipe.ts";
import type { CreateQuery, CreateResponse, KnexDatabase } from "../database/index.ts";
import { EnsureArray } from "../utils/index.ts";
import { ContentAttachmentActions, type CreateContentAttachmentOptions } from "./content/contentAttachment.ts";

type SaveRecipeAttachmentRequest = CreateQuery<{
    recipeId: Recipe["recipeId"];
    attachments: Array<{
        attachmentId: Attachment["attachmentId"];
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
    read: (db: KnexDatabase, request: ReadRecipeAttachmentsRequest): CreateResponse<ReadRecipeAttachmentsResponse> =>
        ContentAttachmentActions.read(
            db,
            EnsureArray(request).map(({ recipeId }) => ({ contentId: recipeId }))
        ).then(response => response.map(({ contentId, ...rest }) => ({ recipeId: contentId, ...rest }))),
    save: (db: KnexDatabase, request: SaveRecipeAttachmentRequest, options?: CreateContentAttachmentOptions) =>
        ContentAttachmentActions.save(
            db,
            EnsureArray(request).map(({ recipeId, attachments }) => ({
                contentId: recipeId,
                attachments,
            })),
            options
        ),
};

export type RecipeAttachmentActions = typeof RecipeAttachmentActions;
