import { Undefined } from "@reillymc/es-utils";
import type { Knex } from "knex";
import { ContentAttachmentTable, lamington } from "../../spec/index.ts";

export const HeroAttachmentActions = {
    save: async (
        db: Knex,
        items: Array<{ contentId: string; attachmentId?: string | null }>,
    ) => {
        const itemsToProcess = items.filter(
            (item) => item.attachmentId !== undefined,
        );

        if (!itemsToProcess.length) return;

        await db(lamington.contentAttachment)
            .whereIn(
                ContentAttachmentTable.contentId,
                itemsToProcess.map((item) => item.contentId),
            )
            .andWhere(ContentAttachmentTable.displayType, "hero")
            .delete();

        const attachments = itemsToProcess
            .map(({ contentId, attachmentId }) => {
                if (attachmentId) {
                    return {
                        contentId,
                        attachmentId,
                        displayType: "hero",
                    };
                }
                return undefined;
            })
            .filter(Undefined);

        if (attachments.length) {
            await db(lamington.contentAttachment)
                .insert(attachments)
                .onConflict(["attachmentId", "contentId"])
                .merge();
        }
    },
};
