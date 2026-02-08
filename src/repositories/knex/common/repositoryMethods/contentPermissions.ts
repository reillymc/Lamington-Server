import { EnsureArray } from "../../../../utils/index.ts";
import type { KnexDatabase } from "../../knex.ts";
import {
    ContentMemberTable,
    ContentTable,
    lamington,
} from "../../spec/index.ts";
import type { ContentMemberStatus } from "./contentMember.ts";

export const verifyContentPermissions = async (
    db: KnexDatabase,
    userId: string,
    contentIds: string[],
    statuses: ContentMemberStatus | ReadonlyArray<ContentMemberStatus>,
): Promise<Record<string, boolean>> => {
    if (contentIds.length === 0) return {};

    const allowedStatuses = EnsureArray(statuses);
    const memberStatuses = allowedStatuses.filter((s) => s !== "O");
    const checkOwner = allowedStatuses.includes("O");

    const rows = await db(lamington.content)
        .select(ContentTable.contentId)
        .leftJoin(lamington.contentMember, (join) => {
            join.on(
                ContentTable.contentId,
                "=",
                ContentMemberTable.contentId,
            ).andOn(ContentMemberTable.userId, "=", db.raw("?", [userId]));
        })
        .whereIn(ContentTable.contentId, contentIds)
        .andWhere((builder) => {
            if (checkOwner) {
                builder.where(ContentTable.createdBy, userId);
            }

            if (memberStatuses.length > 0) {
                if (checkOwner) {
                    builder.orWhereIn(
                        ContentMemberTable.status,
                        memberStatuses,
                    );
                } else {
                    builder.whereIn(ContentMemberTable.status, memberStatuses);
                }
            } else if (!checkOwner) {
                builder.whereRaw("1 = 0");
            }
        });

    const allowedSet = new Set(rows.map((r) => r.contentId));

    return contentIds.reduce<Record<string, boolean>>((acc, id) => {
        acc[id] = allowedSet.has(id);
        return acc;
    }, {});
};
