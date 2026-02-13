import type { Knex } from "knex";
import {
    AttachmentTable,
    ContentAttachmentTable,
    lamington,
} from "../../spec/index.ts";

export const withHeroAttachment =
    (idColumn: string) =>
    <TRecord extends {}, TResult>(
        query: Knex.QueryBuilder<TRecord, TResult>,
    ) => {
        query
            .select({
                heroAttachmentId: ContentAttachmentTable.attachmentId,
                heroAttachmentUri: AttachmentTable.uri,
            })
            .leftJoin(lamington.contentAttachment, (join) => {
                join.on(
                    ContentAttachmentTable.contentId,
                    "=",
                    idColumn,
                ).andOnVal(ContentAttachmentTable.displayType, "=", "hero");
            })
            .leftJoin(
                lamington.attachment,
                ContentAttachmentTable.attachmentId,
                AttachmentTable.attachmentId,
            );
    };
