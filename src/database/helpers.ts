import { lamington, Table } from "./definitions/lamington";

export const Undefined: <T>(x?: T) => x is T = <T>(x?: T): x is T => !!x !== undefined;

export const ObjectFromEntries = <T extends object, K extends symbol | string | number, S>(
    obj: T,
    cast: (entries: Array<[keyof T, T[keyof T]]>) => Array<[K, S]>
): { [k in K]: S } => {
    const entries = Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
    return Object.fromEntries(cast(entries)) as any;
};

export const Alias = <T>(table: Table<T>, tableName: lamington, tableAlias: string) =>
    ObjectFromEntries(table, decTable => decTable.map(([key, column]) => [key, column.replace(tableName, tableAlias)]));
