import { dedupeLast } from "../../../../utils/dedupeLast.ts";
import type { KnexDatabase } from "../../knex.ts";
import {
    AttachmentTable,
    ContentAttachmentTable,
    lamington,
} from "../../spec/index.ts";

export class DeletedAttachmentError extends Error {
    public attachmentIds: ReadonlyArray<string>;

    constructor(attachmentIds: ReadonlyArray<string>) {
        super(`Cannot link deleted attachments: ${attachmentIds.join(", ")}`);
        this.name = "DeletedAttachmentError";
        this.attachmentIds = attachmentIds;
    }
}

export const HeroAttachmentActions = {
    save: async (
        db: KnexDatabase,
        items: Array<{ contentId: string; attachmentId?: string | null }>,
    ): Promise<void> => {
        const itemsToProcess = dedupeLast(
            items.filter((item) => item.attachmentId !== undefined),
            "contentId",
        );

        if (!itemsToProcess.length) return;

        const desiredLinks = itemsToProcess.flatMap(
            ({ contentId, attachmentId }) =>
                attachmentId
                    ? [
                          {
                              contentId,
                              attachmentId,
                              displayType: "hero",
                          },
                      ]
                    : [],
        );

        if (desiredLinks.length) {
            const desiredAttachmentIds = [
                ...new Set(
                    desiredLinks.map(({ attachmentId }) => attachmentId),
                ),
            ];
            const desiredAttachments = await db(lamington.attachment)
                .select(AttachmentTable.attachmentId, AttachmentTable.deletedAt)
                .whereIn(AttachmentTable.attachmentId, desiredAttachmentIds)
                .orderBy(AttachmentTable.attachmentId)
                .forUpdate();

            const deletedAttachmentIds = desiredAttachments
                .filter(({ deletedAt }) => deletedAt !== null)
                .map(({ attachmentId }) => attachmentId);

            if (deletedAttachmentIds.length) {
                throw new DeletedAttachmentError(deletedAttachmentIds);
            }

            await db(lamington.contentAttachment)
                .insert(desiredLinks)
                .onConflict(["attachmentId", "contentId"])
                .merge();

            const desiredPairs = desiredLinks.map(
                ({ contentId, attachmentId }) => [contentId, attachmentId],
            );

            await db(lamington.contentAttachment)
                .whereIn(
                    ContentAttachmentTable.contentId,
                    desiredLinks.map(({ contentId }) => contentId),
                )
                .andWhere(ContentAttachmentTable.displayType, "hero")
                .whereNotIn(
                    [
                        ContentAttachmentTable.contentId,
                        ContentAttachmentTable.attachmentId,
                    ],
                    desiredPairs,
                )
                .delete();
        }

        const clearedContentIds = itemsToProcess
            .filter(({ attachmentId }) => attachmentId === null)
            .map(({ contentId }) => contentId);

        if (clearedContentIds.length) {
            await db(lamington.contentAttachment)
                .whereIn(ContentAttachmentTable.contentId, clearedContentIds)
                .andWhere(ContentAttachmentTable.displayType, "hero")
                .delete();
        }
    },
};
