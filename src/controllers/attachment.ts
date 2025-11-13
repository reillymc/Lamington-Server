import type { Knex } from "knex";
import { attachment, type Attachment } from "../database/definitions/attachment.ts";
import db, { type CreateQuery, type ReadQuery, type ReadResponse, lamington } from "../database/index.ts";
import { EnsureArray } from "../utils/index.ts";

export type SaveAttachmentRequest = Pick<Attachment, "uri" | "createdBy"> & {
    attachmentId?: Attachment["attachmentId"];
};

const saveAttachments = async (trx: Knex, saveRequests: CreateQuery<SaveAttachmentRequest>) => {
    const data = EnsureArray(saveRequests).map(({ attachmentId, uri, createdBy }) => ({
        attachmentId,
        uri,
        createdBy,
    }));

    if (!data.length) return [];

    const result: Pick<Attachment, "attachmentId" | "uri" | "createdBy">[] = await trx<Attachment>(lamington.attachment)
        .insert(data)
        .returning([attachment.attachmentId, attachment.uri, attachment.createdBy]);

    return result;
};

interface GetAttachmentsParams {
    attachmentId: Attachment["attachmentId"];
}

type GetAttachmentsResponse = Attachment;

const readAttachments = async (params: ReadQuery<GetAttachmentsParams>): ReadResponse<GetAttachmentsResponse> => {
    const entityIds = EnsureArray(params).map(({ attachmentId }) => attachmentId);

    const query = db<Attachment>(lamington.contentAttachment)
        .select(attachment.attachmentId, attachment.uri, attachment.createdBy)
        .whereIn(attachment.attachmentId, entityIds);

    return query;
};

export const AttachmentActions = {
    read: readAttachments,
    save: saveAttachments,
};

export type AttachmentActions = typeof AttachmentActions;
