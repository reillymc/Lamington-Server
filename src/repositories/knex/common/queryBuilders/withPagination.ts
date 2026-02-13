import type { Knex } from "knex";

export const withPagination =
    ({ page, pageSize }: { page: number; pageSize: number }) =>
    <TRecord extends {}, TResult>(
        query: Knex.QueryBuilder<TRecord, TResult>,
    ) => {
        query.limit(pageSize + 1).offset((page - 1) * pageSize);
    };
