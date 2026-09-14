import type { KnexDatabase } from "../../knex.ts";
import { ContentTable, lamington } from "../../spec/index.ts";
import { withContentPermissions } from "../queryBuilders/withContentPermissions.ts";
import type { ContentMemberStatus } from "./contentMember.ts";

export type ContentEntity = {
    table: string;
    idColumn: string;
};

export const verifyContentPermissions = async (
    db: KnexDatabase,
    userId: string,
    contentIds: string[],
    statuses:
        | ContentMemberStatus
        | [ContentMemberStatus, ...ContentMemberStatus[]],
    entity: ContentEntity,
    options?: { includeSystem?: boolean },
): Promise<Record<string, boolean>> => {
    const requestedIds = [...new Set(contentIds)];
    if (requestedIds.length === 0) return {};

    const rows: Array<{ [ContentTable.contentId]: string }> = await db(
        lamington.content,
    )
        .select(ContentTable.contentId)
        .whereIn(ContentTable.contentId, requestedIds)
        .innerJoin(entity.table, entity.idColumn, ContentTable.contentId)
        .modify(
            withContentPermissions({
                userId,
                idColumn: ContentTable.contentId,
                statuses: statuses,
                includeSystem: options?.includeSystem,
            }),
        );

    const allowedSet = new Set(rows.map(({ contentId }) => contentId));

    return requestedIds.reduce<Record<string, boolean>>((acc, id) => {
        acc[id] = allowedSet.has(id);
        return acc;
    }, {});
};
