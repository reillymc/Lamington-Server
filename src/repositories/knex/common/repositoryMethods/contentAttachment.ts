import { dedupeLast } from "../../../../utils/dedupeLast.ts";
import type { KnexDatabase } from "../../knex.ts";
import {
    AttachmentTable,
    ContentAttachmentTable,
    lamington,
} from "../../spec/index.ts";

const HERO_DISPLAY_TYPE = "hero";

type HeroItem = {
    contentId: string;
    attachmentId?: string | null;
};

const hasAttachmentIntent = (
    item: HeroItem,
): item is { contentId: string; attachmentId: string | null } =>
    item.attachmentId !== undefined;

const toDesiredByContent = (items: Array<HeroItem>) =>
    new Map(
        dedupeLast(items.filter(hasAttachmentIntent), "contentId").map(
            ({ contentId, attachmentId }) => [contentId, attachmentId] as const,
        ),
    );

const readExistingLinks = (
    db: KnexDatabase,
    contentIds: ReadonlyArray<string>,
) =>
    db(lamington.contentAttachment)
        .select(
            ContentAttachmentTable.contentId,
            ContentAttachmentTable.attachmentId,
        )
        .whereIn(ContentAttachmentTable.contentId, contentIds)
        .andWhere(ContentAttachmentTable.displayType, HERO_DISPLAY_TYPE);

const lockAttachments = async (
    db: KnexDatabase,
    attachmentIds: ReadonlyArray<string>,
): Promise<void> => {
    const ids = [...new Set(attachmentIds)].sort();

    if (!ids.length) return;

    await db(lamington.attachment)
        .select(AttachmentTable.attachmentId)
        .whereIn(AttachmentTable.attachmentId, ids)
        .orderBy(AttachmentTable.attachmentId)
        .forUpdate();
};

export const HeroAttachmentActions = {
    save: async (db: KnexDatabase, items: Array<HeroItem>): Promise<void> => {
        const desiredByContent = toDesiredByContent(items);

        if (!desiredByContent.size) return;

        const existingLinks = await readExistingLinks(db, [
            ...desiredByContent.keys(),
        ]);

        const desiredLinks = [...desiredByContent].flatMap(
            ([contentId, attachmentId]) =>
                attachmentId
                    ? [
                          {
                              contentId,
                              attachmentId,
                              displayType: HERO_DISPLAY_TYPE,
                          },
                      ]
                    : [],
        );

        await lockAttachments(db, [
            ...desiredLinks.map(({ attachmentId }) => attachmentId),
            ...existingLinks.map(({ attachmentId }) => attachmentId),
        ]);

        if (desiredLinks.length) {
            await db(lamington.contentAttachment)
                .insert(desiredLinks)
                .onConflict(["attachmentId", "contentId"])
                .merge();
        }

        const removedLinks = existingLinks.filter(
            ({ contentId, attachmentId }) =>
                desiredByContent.get(contentId) !== attachmentId,
        );

        if (removedLinks.length) {
            await db(lamington.contentAttachment)
                .whereIn(
                    [
                        ContentAttachmentTable.contentId,
                        ContentAttachmentTable.attachmentId,
                    ],
                    removedLinks.map(({ contentId, attachmentId }) => [
                        contentId,
                        attachmentId,
                    ]),
                )
                .andWhere(ContentAttachmentTable.displayType, HERO_DISPLAY_TYPE)
                .delete();
        }
    },
};
