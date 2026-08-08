export type LifecycleTrigger = "startup";

export type Job<TParams extends unknown[] = []> = {
    run: (...params: TParams) => Promise<boolean>;
    trigger?: TParams["length"] extends 0
        ? ReadonlyArray<LifecycleTrigger>
        : never;
};
