import { EnsureArray } from "../../utils/index.ts";
import type { AttachmentRepository } from "../attachmentRepository.ts";
import { buildUpdateRecord } from "./common/dataFormatting/buildUpdateRecord.ts";
import type { KnexDatabase } from "./knex.ts";
import { AttachmentTable, lamington } from "./spec/index.ts";

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
                AttachmentTable,
            );

            if (updateData) {
                await db(lamington.attachment)
                    .where(
                        AttachmentTable.attachmentId,
                        attachmentItem.attachmentId,
                    )
                    .update(updateData);
            }
        }

        const results = await db(lamington.attachment)
            .whereIn(
                AttachmentTable.attachmentId,
                attachments.map(({ attachmentId }) => attachmentId),
            )
            .select("*");

        return { userId, attachments: results };
    },
};
