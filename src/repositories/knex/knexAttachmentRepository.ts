import { EnsureArray } from "@reillymc/es-utils";
import type { Knex } from "knex";
import type { AttachmentRepository } from "../attachmentRepository.ts";
import { buildUpdateRecord } from "./common/dataFormatting/buildUpdateRecord.ts";
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
    readPurgeable: async (db, { limit, createdBefore }) => {
        const attachments = await db(lamington.attachment)
            .select(AttachmentTable.attachmentId)
            .where((builder) =>
                builder
                    .whereNotNull(AttachmentTable.deletedAt)
                    .orWhere(AttachmentTable.createdAt, "<", createdBefore),
            )
            .whereNotExists(withoutReferences)
            // Soft-deleted rows sort first (NULLS LAST in ascending order),
            // then never-linked uploads past the grace period, oldest first.
            .orderBy(AttachmentTable.deletedAt)
            .orderBy(AttachmentTable.createdAt)
            .limit(limit);

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
