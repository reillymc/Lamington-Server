export const dedupeLast = <T>(
    items: ReadonlyArray<T>,
    ...keys: [keyof T, ...Array<keyof T>]
): Array<T> => {
    const deduped = new Map<string, T>();

    for (const item of items) {
        deduped.set(
            keys.map((property) => String(item[property])).join(""),
            item,
        );
    }

    return [...deduped.values()];
};
