import { ForeignKeyViolationError } from "../../../common/errors.ts";
import type { ContentMember } from "../../../temp.ts";
import type { KnexDatabase } from "../../knex.ts";
import { ContentMemberTable, lamington, UserTable } from "../../spec/index.ts";
import { toUndefined } from "../dataFormatting/toUndefined.ts";
import { isForeignKeyViolation } from "../postgresErrors.ts";

export type ContentMemberStatus = "O" | "A" | "M" | "P" | "B";

const parseStatus = (status?: string): ContentMemberStatus | undefined => {
    switch (status) {
        case "A":
        case "B":
        case "M":
        case "O":
        case "P":
            return status;
        default:
            return undefined;
    }
};

export const ContentMemberActions = {
    readByContentId: async (
        db: KnexDatabase,
        contentIds: string | string[],
    ) => {
        const contentIdList = Array.isArray(contentIds)
            ? contentIds
            : [contentIds];

        const rows = await db<ContentMember>(lamington.contentMember)
            .select(
                ContentMemberTable.contentId,
                ContentMemberTable.userId,
                ContentMemberTable.status,
                UserTable.firstName,
                UserTable.lastName,
            )
            .whereIn(ContentMemberTable.contentId, contentIdList)
            .leftJoin(
                lamington.user,
                ContentMemberTable.userId,
                UserTable.userId,
            );

        return rows.map((row) => ({
            contentId: row.contentId,
            userId: row.userId,
            firstName: row.firstName,
            lastName: row.lastName,
            status: toUndefined(parseStatus(row.status)),
        }));
    },

    save: async (
        db: KnexDatabase,
        items: Array<{
            contentId: string;
            userId: string;
            status?: ContentMemberStatus;
        }>,
    ) => {
        if (!items.length) return;

        try {
            await db<ContentMember>(lamington.contentMember)
                .insert(items)
                .onConflict(["contentId", "userId"])
                .merge(["status"]);

            return ContentMemberActions.readByContentId(
                db,
                items.map(({ contentId }) => contentId),
            );
        } catch (error) {
            if (isForeignKeyViolation(error)) {
                throw new ForeignKeyViolationError(error);
            }
            throw error;
        }
    },

    delete: async (
        db: KnexDatabase,
        items: Array<{
            contentId: string;
            userId: string;
        }>,
    ) => {
        if (!items.length) return 0;

        const deletedCount = await db<ContentMember>(lamington.contentMember)
            .where((builder) => {
                for (const { contentId, userId } of items) {
                    builder.orWhere({ contentId, userId });
                }
            })
            .delete();

        return deletedCount;
    },
};
