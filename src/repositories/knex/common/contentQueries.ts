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
    ({ userId, idColumn, ownerColumns = [], allowedStatuses = [] }: WithContentReadPermissionsParams) =>
    <TRecord extends {}, TResult>(query: Knex.QueryBuilder<TRecord, TResult>) => {
        const parsedOwnerColumns = EnsureArray(ownerColumns);
        const owners = parsedOwnerColumns.length ? parsedOwnerColumns : [content.createdBy];

        query
            .leftJoin(lamington.contentMember, join =>
                join.on(idColumn, "=", contentMember.contentId).andOnVal(contentMember.userId, "=", userId)
            )
            .where(b => {
                b.orWhere(sub =>
                    sub.whereNotNull(contentMember.userId).whereIn(contentMember.status, EnsureArray(allowedStatuses))
                );

                for (const col of owners) {
                    b.orWhere(col, userId);
                }
            });
    };
