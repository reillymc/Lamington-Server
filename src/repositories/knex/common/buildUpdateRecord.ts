export const buildUpdateRecord = <
    Definition extends ReadonlyArray<string>,
    Source extends Record<string, unknown> = Record<string, unknown>,
>(
    source: Source,
    definition: Definition,
    mapping: Partial<
        Record<Definition[number], (source: Source) => unknown>
    > = {},
) => {
    const update: Record<string, unknown> = {};

    for (const column of definition) {
        if (column in mapping) {
            const mapper = mapping[column as Definition[number]];
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
