import type { Knex } from "knex";
import { ContentTable, lamington, UserTable } from "../../spec/index.ts";

export const withContentAuthor = <TRecord extends {}, TResult>(
    query: Knex.QueryBuilder<TRecord, TResult>,
) => {
    query
        .select(UserTable.firstName, ContentTable.createdBy)
        .leftJoin(lamington.user, ContentTable.createdBy, UserTable.userId);
};
