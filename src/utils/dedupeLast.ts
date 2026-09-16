export const dedupeLast = <T>(
    items: ReadonlyArray<T>,
    ...keys: [keyof T, ...Array<keyof T>]
): Array<T> => {
    const deduped = new Map<string, T>();

    for (const item of items) {
        deduped.set(
            JSON.stringify(keys.map((property) => item[property])),
            item,
        );
    }

    return [...deduped.values()];
};
