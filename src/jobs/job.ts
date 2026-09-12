export type LifecycleTrigger = "startup" | "interval";

export type Job<TParams extends unknown[] = []> = {
    run: (...params: TParams) => Promise<boolean>;
    trigger?: TParams["length"] extends 0
        ? ReadonlyArray<LifecycleTrigger>
        : never;
    interval?: TParams["length"] extends 0 ? number : never;
};

export type CreateJob<T, P extends unknown[] = []> = (params: T) => Job<P>;
