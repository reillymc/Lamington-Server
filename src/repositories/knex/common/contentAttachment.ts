import { EnsureArray } from "../../../utils/index.ts";
import type { Attachment } from "../../attachmentRepository.ts";
import type { ContentAttachment } from "../../temp.ts";
import type { KnexDatabase } from "../knex.ts";
import {
    AttachmentTable,
    ContentAttachmentTable,
    type CreateQuery,
    lamington,
    type ReadQuery,
    type ReadResponse,
} from "../spec/index.ts";

type SaveContentAttachmentRequest = Pick<ContentAttachment, "contentId"> & {
    attachments?: Array<{
        attachmentId: ContentAttachment["attachmentId"];
        displayType: ContentAttachment["displayType"];
        displayId?: ContentAttachment["displayId"];
        displayOrder?: ContentAttachment["displayOrder"];
    }>;
};

const saveContentAttachments = async (
    db: KnexDatabase,
    saveRequests: CreateQuery<SaveContentAttachmentRequest>,
) => {
    for (const { attachments = [], contentId } of EnsureArray(saveRequests)) {
        const data = attachments.map(
            ({ displayType, attachmentId, displayId, displayOrder }) => ({
                displayType,
                attachmentId,
                displayId,
                displayOrder,
                contentId,
            }),
        );

        if (!data.length) return;

        await db<ContentAttachment>(lamington.contentAttachment)
            .insert(data)
            .onConflict(["attachmentId", "contentId"])
            .merge();
    }
};

interface GetContentAttachmentsParams {
    contentId: string;
}

type GetContentAttachmentsResponse = ContentAttachment &
    Pick<Attachment, "createdBy" | "uri">;

const readContentAttachments = async (
    db: KnexDatabase,
    params: ReadQuery<GetContentAttachmentsParams>,
): ReadResponse<GetContentAttachmentsResponse> => {
    const entityIds = EnsureArray(params).map(({ contentId }) => contentId);

    const query = db<GetContentAttachmentsResponse>(lamington.contentAttachment)
        .select(
            ContentAttachmentTable.contentId,
            ContentAttachmentTable.attachmentId,
            AttachmentTable.createdBy,
            ContentAttachmentTable.displayId,
            ContentAttachmentTable.displayOrder,
            ContentAttachmentTable.displayType,
            AttachmentTable.uri,
        )
        .whereIn(ContentAttachmentTable.contentId, entityIds)
        .leftJoin(
            lamington.attachment,
            ContentAttachmentTable.attachmentId,
            AttachmentTable.attachmentId,
        );

    return query;
};

export const ContentAttachmentActions = {
    read: readContentAttachments,
    save: saveContentAttachments,
};

export type ContentAttachmentActions = typeof ContentAttachmentActions;
