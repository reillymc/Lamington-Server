import type { KnexDatabase } from "../../knex.ts";
import { ContentTable, lamington } from "../../spec/index.ts";
import { withContentPermissions } from "../queryBuilders/withContentPermissions.ts";
import type { ContentMemberStatus } from "./contentMember.ts";

export const verifyContentPermissions = async (
    db: KnexDatabase,
    userId: string,
    contentIds: string[],
    statuses:
        | ContentMemberStatus
        | [ContentMemberStatus, ...ContentMemberStatus[]],
): Promise<Record<string, boolean>> => {
    if (contentIds.length === 0) return {};

    const rows: any[] = await db(lamington.content)
        .select(ContentTable.contentId)
        .whereIn(ContentTable.contentId, contentIds)
        .modify(
            withContentPermissions({
                userId,
                idColumn: ContentTable.contentId,
                statuses: statuses,
            }),
        );

    const allowedSet = new Set(rows.map(({ contentId }) => contentId));

    return contentIds.reduce<Record<string, boolean>>((acc, id) => {
        acc[id] = allowedSet.has(id);
        return acc;
    }, {});
};
