export type DynamicallyKeyedObject<T extends string, R = void> = R extends void
    ? Record<T, string>
    : Record<T, string> & R;
