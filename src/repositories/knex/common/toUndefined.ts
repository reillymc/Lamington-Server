export const toUndefined = <T>(value: T | null): T | undefined =>
    value === null ? undefined : value;
