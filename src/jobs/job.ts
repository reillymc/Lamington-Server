import type { TransactionRunner } from "../repositories/repository.ts";

export type LifecycleTrigger = "startup";

export type Job<TParams extends unknown[] = []> = {
    run: (...params: TParams) => Promise<boolean>;
    trigger?: TParams["length"] extends 0
        ? ReadonlyArray<LifecycleTrigger>
        : never;
};

type JobFactory<TConfig, TParams extends unknown[]> = [TConfig] extends [
    { repositories: unknown },
]
    ? (params: { transaction: TransactionRunner } & TConfig) => Job<TParams>
    : (params: TConfig) => Job<TParams>;

/**
 * Creates a job factory. The implementation's `run` method is automatically
 * wrapped in a database transaction when the job config declares repositories,
 * so all repository calls within it share a single transaction. Errors are
 * logged by the implementation and rethrown, rolling back the transaction; the
 * helper then returns `false` so `run` never rejects. Jobs with no
 * repositories are returned unwrapped.
 */
export const createJob = <
    TParams extends unknown[] = [],
    TConfig extends object = never,
>(
    impl: (config: TConfig) => Omit<Job<TParams>, "run"> & {
        run: (...params: TParams) => Promise<boolean>;
    },
): JobFactory<TConfig, TParams> =>
    (({
        transaction,
        ...config
    }: { transaction?: TransactionRunner } & TConfig) => {
        const { run, ...job } = impl(config as TConfig);
        if (!transaction) {
            return { ...job, run };
        }
        return {
            ...job,
            run: async (...params: TParams) => {
                try {
                    return await transaction(() => run(...params));
                } catch {
                    return false;
                }
            },
        };
    }) as JobFactory<TConfig, TParams>;
