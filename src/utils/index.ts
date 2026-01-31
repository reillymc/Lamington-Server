type Undefined = <T>(x?: T) => x is NonNullable<typeof x>;

export const Undefined: Undefined = (x): x is NonNullable<typeof x> =>
    x !== null && x !== undefined;

export const ObjectFromEntries = <
    T extends object,
    K extends symbol | string | number,
    S,
>(
    obj: T,
    cast: (entries: Array<[keyof T, T[keyof T]]>) => Array<[K, S]>,
): { [k in K]: S } => {
    const entries = Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
    return Object.fromEntries(cast(entries)) as any;
};

export function EnsureArray<T>(x: T | T[]): T[];
export function EnsureArray<T>(x: readonly T[]): readonly T[];
export function EnsureArray<T>(x: T | readonly T[]): readonly T[];
export function EnsureArray<T>(x: T | T[] | readonly T[]): T[] | readonly T[] {
    return Array.isArray(x) ? x : [x as T];
}
