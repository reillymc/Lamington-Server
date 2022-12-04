import { lamington, Table } from "./definitions";
import { ObjectFromEntries } from "../utils";

export const Alias = <T>(table: Table<T>, tableName: lamington, tableAlias: string) =>
    ObjectFromEntries(table, decTable => decTable.map(([key, column]) => [key, column.replace(tableName, tableAlias)]));
