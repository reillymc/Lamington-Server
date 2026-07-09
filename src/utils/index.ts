type Undefined = <T>(x?: T) => x is NonNullable<typeof x>;

export const Undefined: Undefined = (x): x is NonNullable<typeof x> =>
    x !== null && x !== undefined;

export function EnsureArray<T>(x: T | T[]): T[];
export function EnsureArray<T>(x: readonly T[]): readonly T[];
export function EnsureArray<T>(x: T | readonly T[]): readonly T[];
export function EnsureArray<T>(x: T | T[] | readonly T[]): T[] | readonly T[] {
    return Array.isArray(x) ? x : [x as T];
}
