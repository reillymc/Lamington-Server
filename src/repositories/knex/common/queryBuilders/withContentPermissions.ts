import { EnsureArray } from "@reillymc/es-utils";
import type { Knex } from "knex";
import { SYSTEM_USER_ID } from "../../../../utils/systemUser.ts";
import {
    ContentMemberTable,
    ContentTable,
    lamington,
} from "../../spec/index.ts";
import type { ContentMemberStatus } from "../repositoryMethods/contentMember.ts";

type WithContentReadPermissionsParams = {
    userId: string;
    idColumn: string;
    statuses:
        | ContentMemberStatus
        | [ContentMemberStatus, ...ReadonlyArray<ContentMemberStatus>];
    includeSystem?: boolean;
    publicColumn?: string; // TODO: remove once cleaned up recipe public column
};

export const withContentPermissions =
    ({ userId, idColumn, ...params }: WithContentReadPermissionsParams) =>
    <TRecord extends {}, TResult>(
        query: Knex.QueryBuilder<TRecord, TResult>,
    ) => {
        const statuses = EnsureArray(params.statuses);

        query
            .leftJoin(lamington.contentMember, (join) =>
                join
                    .on(idColumn, "=", ContentMemberTable.contentId)
                    .andOnVal(ContentMemberTable.userId, "=", userId),
            )
            .where((b) => {
                if (statuses.length > 0) {
                    b.orWhere((sub) =>
                        sub
                            .whereNotNull(ContentMemberTable.userId)
                            .whereIn(ContentMemberTable.status, statuses),
                    );
                }

                if (statuses.includes("O")) {
                    b.orWhere(ContentTable.createdBy, userId);
                }

                if (params.includeSystem) {
                    b.orWhere(ContentTable.createdBy, SYSTEM_USER_ID);
                }

                if (params.publicColumn) {
                    b.orWhere(params.publicColumn, true);
                }
            });
    };
