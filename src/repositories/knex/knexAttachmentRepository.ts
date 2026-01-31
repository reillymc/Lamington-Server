import { EnsureArray } from "../../utils/index.ts";
import type { AttachmentRepository } from "../attachmentRepository.ts";
import { buildUpdateRecord } from "./common/buildUpdateRecord.ts";
import type { KnexDatabase } from "./knex.ts";
import { attachment, lamington } from "./spec/index.ts";

export const KnexAttachmentRepository: AttachmentRepository<KnexDatabase> = {
    create: async (db, { userId, attachments }) => {
        const results = await db(lamington.attachment)
            .insert(
                EnsureArray(attachments).map(({ uri }) => ({
                    uri,
                    createdBy: userId,
                })),
            )
            .returning("*");

        return { userId, attachments: results };
    },
    update: async (db, { userId, attachments }) => {
        for (const attachmentItem of attachments) {
            const updateData = buildUpdateRecord(attachmentItem, attachment);

            if (updateData) {
                await db(lamington.attachment)
                    .where(attachment.attachmentId, attachmentItem.attachmentId)
                    .update(updateData);
            }
        }

        const results = await db(lamington.attachment)
            .whereIn(
                attachment.attachmentId,
                attachments.map(({ attachmentId }) => attachmentId),
            )
            .select("*");

        return { userId, attachments: results };
    },
};
