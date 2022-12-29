export const Undefined: <T>(x?: T) => x is T = <T>(x?: T): x is T => x !== null && x !== undefined;

export const ObjectFromEntries = <T extends object, K extends symbol | string | number, S>(
    obj: T,
    cast: (entries: Array<[keyof T, T[keyof T]]>) => Array<[K, S]>
): { [k in K]: S } => {
    const entries = Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
    return Object.fromEntries(cast(entries)) as any;
};
