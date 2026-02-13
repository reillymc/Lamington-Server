import { Undefined } from "../../../../utils/index.ts";
import type { KnexDatabase } from "../../knex.ts";
import { ContentAttachmentTable, lamington } from "../../spec/index.ts";

export const HeroAttachmentActions = {
    save: async (
        db: KnexDatabase,
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
                        displayOrder: 0,
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
