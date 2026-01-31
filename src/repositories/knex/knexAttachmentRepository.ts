import {
    attachment,
    attachmentColumns,
} from "../../database/definitions/attachment.ts";
import { type KnexDatabase, lamington } from "../../database/index.ts";
import { EnsureArray } from "../../utils/index.ts";
import type { AttachmentRepository } from "../attachmentRepository.ts";
import { buildUpdateRecord } from "./common/buildUpdateRecord.ts";

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
            const updateData = buildUpdateRecord(
                attachmentItem,
                attachmentColumns,
            );

            if (updateData) {
                await db(lamington.attachment)
                    .where(attachment.attachmentId, attachmentItem.attachmentId)
                    .update(updateData);
            }
        }

        const results = await db(lamington.attachment)
            .whereIn(
                attachment.attachmentId,
                attachments.map((a) => a.attachmentId),
            )
            .select("*");

        return { userId, attachments: results };
    },
};
