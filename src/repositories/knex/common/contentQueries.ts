import type { Knex } from "knex";
import { content } from "../../../database/definitions/content.ts";
import { contentMember } from "../../../database/definitions/contentMember.ts";
import { lamington } from "../../../database/index.ts";

export const withContentReadPermissions =
    ({
        userId,
        idColumn,
        ownerColumn = content.createdBy,
    }: {
        userId: string;
        idColumn: string;
        ownerColumn?: string;
    }) =>
    <TRecord extends {}, TResult>(query: Knex.QueryBuilder<TRecord, TResult>) => {
        query
            .leftJoin(lamington.contentMember, join =>
                join.on(idColumn, "=", contentMember.contentId).andOnVal(contentMember.userId, "=", userId)
            )
            .where(b =>
                b
                    .where(ownerColumn, userId)
                    .orWhere(sub =>
                        sub.whereNotNull(contentMember.userId).whereIn(contentMember.status, ["A", "M", "O", "P"])
                    )
            );
    };
