export const buildUpdateRecord = <Definition extends ReadonlyArray<string>>(
    source: Record<string, unknown>,
    definition: Definition,
    mapping: Record<
        string,
        Definition[number] | { target: Definition[number]; transform: (val: unknown) => unknown }
    > = {}
) => {
    const update: Record<string, unknown> = {};

    Object.entries(source).forEach(([key, value]) => {
        if (value === undefined) return;

        const mapConfig = mapping[key];
        let targetColumn = key;
        let finalValue = value as unknown;

        if (mapConfig) {
            if (typeof mapConfig === "string") {
                targetColumn = mapConfig;
            } else {
                targetColumn = mapConfig.target;
                finalValue = mapConfig.transform(value);
            }
        }

        if (targetColumn && definition.includes(targetColumn)) {
            update[targetColumn] = finalValue;
        }
    });

    if (Object.keys(update).length === 0) {
        return undefined;
    }

    return update;
};
