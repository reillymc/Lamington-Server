import { EnsureArray } from "@reillymc/es-utils";
import type { Knex } from "knex";
import type { AttachmentRepository } from "../attachmentRepository.ts";
import { toUndefined } from "./common/dataFormatting/toUndefined.ts";
import type { KnexDatabase } from "./knex.ts";
import {
    AttachmentTable,
    ContentAttachmentTable,
    lamington,
} from "./spec/index.ts";

const withoutReferences = (qb: Knex.QueryBuilder) =>
    qb
        .select(1)
        .from(lamington.contentAttachment)
        .whereRaw("?? = ??", [
            ContentAttachmentTable.attachmentId,
            AttachmentTable.attachmentId,
        ]);

export const KnexAttachmentRepository: AttachmentRepository<KnexDatabase> = {
    create: async (db, { userId, attachments }) => {
        const results = await db(lamington.attachment)
            .insert(
                EnsureArray(attachments).map(({ preview }) => ({
                    preview,
                    createdBy: userId,
                })),
            )
            .returning("*");

        return {
            userId,
            attachments: results.map((attachment) => ({
                ...attachment,
                preview: toUndefined(attachment.preview),
            })),
        };
    },
    verifyPermissions: async (db, { userId, attachments }) => {
        const requestedIds = attachments.map(
            ({ attachmentId }) => attachmentId,
        );

        const rows = await db(lamington.attachment)
            .select(AttachmentTable.attachmentId)
            .whereIn(AttachmentTable.attachmentId, requestedIds)
            .where(AttachmentTable.createdBy, userId)
            .whereNull(AttachmentTable.deletedAt);

        const allowedSet = new Set(
            rows.map(({ attachmentId }) => attachmentId),
        );

        return {
            userId,
            attachments: attachments.map(({ attachmentId }) => ({
                attachmentId,
                hasPermissions: allowedSet.has(attachmentId),
            })),
        };
    },
    claimPurgeable: async (db, { limit, createdBefore }) => {
        const attachments = await db(lamington.attachment)
            .select(AttachmentTable.attachmentId)
            .where((builder) =>
                builder
                    .whereNotNull(AttachmentTable.deletedAt)
                    .orWhere(AttachmentTable.createdAt, "<", createdBefore),
            )
            .whereNotExists(withoutReferences)
            .orderBy(AttachmentTable.attachmentId)
            .forUpdate()
            .skipLocked()
            .limit(limit);

        const attachmentIds = attachments.map(
            ({ attachmentId }) => attachmentId,
        );

        if (attachmentIds.length) {
            await db(lamington.attachment)
                .whereIn(AttachmentTable.attachmentId, attachmentIds)
                .whereNull(AttachmentTable.deletedAt)
                .update({ deletedAt: db.fn.now() });
        }

        return { attachments };
    },
    deletePurgeable: async (db, { attachments }) => {
        const attachmentIds = attachments.map(
            ({ attachmentId }) => attachmentId,
        );

        if (!attachmentIds.length) return { count: 0 };

        const count = await db(lamington.attachment)
            .whereIn(AttachmentTable.attachmentId, attachmentIds)
            .whereNotExists(withoutReferences)
            .delete();

        return { count };
    },
    readAllForUsers: async (db, { users }) => {
        const userIds = users.map(({ userId }) => userId);

        if (!userIds.length) return { attachments: [] };

        const attachments = await db(lamington.attachment)
            .select(AttachmentTable.attachmentId)
            .whereIn(AttachmentTable.createdBy, userIds);

        return { attachments };
    },
};
