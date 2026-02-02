import type { Table } from "../spec/index.ts";

export const buildUpdateRecord = <
    Definition extends Table,
    Source extends Record<string, unknown> = Record<string, unknown>,
>(
    source: Source,
    definition: Definition,
    mapping: Partial<
        Record<keyof Definition, (source: Source) => unknown>
    > = {},
) => {
    const update: Record<string, unknown> = {};

    for (const column of Object.keys(definition)) {
        if (column in mapping) {
            const mapper = mapping[column as keyof Definition];
            if (mapper) {
                const value = mapper(source);
                if (value !== undefined) {
                    update[column] = value;
                }
            }
        } else if ((source as Record<string, unknown>)[column] !== undefined) {
            update[column] = (source as Record<string, unknown>)[column];
        }
    }

    if (Object.keys(update).length === 0) {
        return undefined;
    }

    return update;
};
