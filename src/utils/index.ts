type Undefined = <T>(x?: T) => x is NonNullable<typeof x>;

export const Undefined: Undefined = (x): x is NonNullable<typeof x> => x !== null && x !== undefined;

export const ObjectFromEntries = <T extends object, K extends symbol | string | number, S>(
    obj: T,
    cast: (entries: Array<[keyof T, T[keyof T]]>) => Array<[K, S]>
): { [k in K]: S } => {
    const entries = Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
    return Object.fromEntries(cast(entries)) as any;
};

export const EnsureArray = <T>(x: T | T[]): T[] => (Array.isArray(x) ? x : [x]);
export const EnsureDefinedArray = <T>(x: T | T[]): NonNullable<T>[] => (Array.isArray(x) ? x : [x]).filter(Undefined);

export const BisectOnValidPartialItems = <T>(
    arr: T[],
    predicate: (item: T) => (T extends Partial<infer R> ? R : never) | undefined
) => {
    type Y = (typeof arr)[number];
    type X = Y extends Partial<infer R> ? R : never;
    const trueArr: X[] = [];
    const falseArr: unknown[] = [];

    arr.forEach(item => {
        const validated = predicate(item);
        if (validated) {
            trueArr.push(validated);
        } else {
            falseArr.push(item);
        }
    });

    return [trueArr, falseArr] as const;
};

export const BisectOnValidItems = <R, T = any>(arr: T[], predicate: (item: T) => R | undefined) => {
    const trueArr: R[] = [];
    const falseArr: unknown[] = [];

    arr.forEach(item => {
        const validated = predicate(item);
        if (validated) {
            trueArr.push(validated);
        } else {
            falseArr.push(item);
        }
    });

    return [trueArr, falseArr] as const;
};

export const randomElement = <T>(array: T[]): T | undefined => array[Math.floor(Math.random() * array.length)];
