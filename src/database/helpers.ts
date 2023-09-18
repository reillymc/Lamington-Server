import { Knex } from "knex";

import { ObjectFromEntries } from "../utils";
import { lamington, ServiceResponse, Table } from "./definitions";

export type Columns<T> = Required<{ [key in keyof T]: string | Knex.Raw | Knex.QueryBuilder }>;

export const Alias = <T>(table: Table<T>, tableName: lamington, tableAlias: string) =>
    ObjectFromEntries(table, decTable => decTable.map(([key, column]) => [key, column.replace(tableName, tableAlias)]));

export const GetColumns = <T extends Record<string, any>, K extends keyof T, E extends string | never = never>(
    tableMap: Columns<Omit<ServiceResponse<T, K>, E>>
) => Object.values(tableMap);
