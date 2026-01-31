import { EnsureArray, Undefined } from "../../../utils/index.ts";
import type { Attachment } from "../../attachmentRepository.ts";
import type { ContentAttachment } from "../../temp.ts";
import type { KnexDatabase } from "../knex.ts";
import {
    attachment,
    type CreateQuery,
    contentAttachment,
    lamington,
    type ReadQuery,
    type ReadResponse,
} from "../spec/index.ts";

export type SaveContentAttachmentRequest = Pick<
    ContentAttachment,
    "contentId"
> & {
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
    options?: CreateContentAttachmentOptions,
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

        if (options?.trimNotIn) {
            const _res = await db<ContentAttachment>(
                lamington.contentAttachment,
            )
                .where({ contentId })
                .whereNotIn(
                    contentAttachment.attachmentId,
                    data
                        .map(({ attachmentId }) => attachmentId)
                        .filter(Undefined),
                )
                .delete();
        }

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
            contentAttachment.contentId,
            contentAttachment.attachmentId,
            attachment.createdBy,
            contentAttachment.displayId,
            contentAttachment.displayOrder,
            contentAttachment.displayType,
            attachment.uri,
        )
        .whereIn(contentAttachment.contentId, entityIds)
        .leftJoin(
            lamington.attachment,
            contentAttachment.attachmentId,
            attachment.attachmentId,
        );

    return query;
};

export const ContentAttachmentActions = {
    read: readContentAttachments,
    save: saveContentAttachments,
};

export type ContentAttachmentActions = typeof ContentAttachmentActions;
