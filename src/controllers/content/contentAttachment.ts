import { attachment, type Attachment } from "../../database/definitions/attachment.ts";
import { contentAttachment, type ContentAttachment } from "../../database/definitions/contentAttachment.ts";
import {
    type CreateQuery,
    type KnexDatabase,
    type ReadQuery,
    type ReadResponse,
    lamington,
} from "../../database/index.ts";
import { EnsureArray, Undefined } from "../../utils/index.ts";

export type SaveContentAttachmentRequest = Pick<ContentAttachment, "contentId"> & {
    attachments?: Array<{
        attachmentId: ContentAttachment["attachmentId"];
        displayType: ContentAttachment["displayType"];
        displayId?: ContentAttachment["displayId"];
        displayOrder?: ContentAttachment["displayOrder"];
    }>;
};

export interface CreateContentAttachmentOptions {
    trimNotIn?: boolean;
}

const saveContentAttachments = async (
    db: KnexDatabase,
    saveRequests: CreateQuery<SaveContentAttachmentRequest>,
    options?: CreateContentAttachmentOptions
) => {
    for (const { attachments = [], contentId } of EnsureArray(saveRequests)) {
        const data = attachments.map(({ displayType, attachmentId, displayId, displayOrder }) => ({
            displayType,
            attachmentId,
            displayId,
            displayOrder,
            contentId,
        }));

        if (options?.trimNotIn) {
            const res = await db<ContentAttachment>(lamington.contentAttachment)
                .where({ contentId })
                .whereNotIn(
                    contentAttachment.attachmentId,
                    data.map(({ attachmentId }) => attachmentId).filter(Undefined)
                )
                .delete();
        }

        if (!data.length) return;

        await db<ContentAttachment>(lamington.contentAttachment).insert(data).onConflict(["attachmentId", "contentId"]).merge();
    }
};

interface GetContentAttachmentsParams {
    contentId: string;
}

type GetContentAttachmentsResponse = ContentAttachment & Pick<Attachment, "createdBy" | "uri">;

const readContentAttachments = async (
    db: KnexDatabase,
    params: ReadQuery<GetContentAttachmentsParams>
): ReadResponse<GetContentAttachmentsResponse> => {
    const entityIds = EnsureArray(params).map(({ contentId }) => contentId);

    const query = db<GetContentAttachmentsResponse>(lamington.contentAttachment)
        .select(
            contentAttachment.contentId,
            contentAttachment.attachmentId,
            attachment.createdBy,
            contentAttachment.displayId,
            contentAttachment.displayOrder,
            contentAttachment.displayType,
            attachment.uri
        )
        .whereIn(contentAttachment.contentId, entityIds)
        .leftJoin(lamington.attachment, contentAttachment.attachmentId, attachment.attachmentId);

    return query;
};

export const ContentAttachmentActions = {
    read: readContentAttachments,
    save: saveContentAttachments,
};

export type ContentAttachmentActions = typeof ContentAttachmentActions;
