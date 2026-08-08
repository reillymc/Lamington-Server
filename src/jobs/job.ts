export type LifecycleTrigger = "startup";

export type Job = {
    run: () => Promise<boolean>;
    trigger?: ReadonlyArray<LifecycleTrigger>;
};

export type CreateJob<T> = (params: T) => Job;
