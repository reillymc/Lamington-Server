import type { Knex } from "knex";
import { content } from "../../../database/definitions/content.ts";
import { contentMember } from "../../../database/definitions/contentMember.ts";
import { lamington } from "../../../database/index.ts";
import { EnsureArray } from "../../../utils/index.ts";

interface WithContentReadPermissionsParams {
    userId: string;
    idColumn: string;
    ownerColumns?: string | string[];
    allowedStatuses?: string | string[];
}

export const withContentReadPermissions =
    ({
        userId,
        idColumn,
        ownerColumns,
        allowedStatuses = [],
    }: WithContentReadPermissionsParams) =>
    <TRecord extends {}, TResult>(
        query: Knex.QueryBuilder<TRecord, TResult>,
    ) => {
        const owners =
            ownerColumns === undefined
                ? [content.createdBy]
                : EnsureArray(ownerColumns);

        query
            .leftJoin(lamington.contentMember, (join) =>
                join
                    .on(idColumn, "=", contentMember.contentId)
                    .andOnVal(contentMember.userId, "=", userId),
            )
            .where((b) => {
                let hasCondition = false;
                const statuses = EnsureArray(allowedStatuses);
                if (statuses.length > 0) {
                    b.orWhere((sub) =>
                        sub
                            .whereNotNull(contentMember.userId)
                            .whereIn(contentMember.status, statuses),
                    );
                    hasCondition = true;
                }

                for (const col of owners) {
                    b.orWhere(col, userId);
                    hasCondition = true;
                }

                if (!hasCondition) {
                    b.whereRaw("1 = 0");
                }
            });
    };
