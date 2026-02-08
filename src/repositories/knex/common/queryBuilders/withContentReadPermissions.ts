import type { Knex } from "knex";
import { EnsureArray } from "../../../../utils/index.ts";
import {
    ContentMemberTable,
    ContentTable,
    lamington,
} from "../../spec/index.ts";

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
                ? [ContentTable.createdBy]
                : EnsureArray(ownerColumns);

        query
            .leftJoin(lamington.contentMember, (join) =>
                join
                    .on(idColumn, "=", ContentMemberTable.contentId)
                    .andOnVal(ContentMemberTable.userId, "=", userId),
            )
            .where((b) => {
                let hasCondition = false;
                const statuses = EnsureArray(allowedStatuses);
                if (statuses.length > 0) {
                    b.orWhere((sub) =>
                        sub
                            .whereNotNull(ContentMemberTable.userId)
                            .whereIn(ContentMemberTable.status, statuses),
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
