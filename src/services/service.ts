import { EnsureArray } from "@reillymc/es-utils";
import type { AppJobs } from "../jobs/index.ts";
import type { AppRepositories } from "../repositories/index.ts";
import type { TransactionRunner } from "../repositories/repository.ts";
import { AppError } from "../utils/logger.ts";

type ServiceArgs<
    KRepositories extends keyof AppRepositories,
    KJobs extends keyof AppJobs,
    TConfig extends Record<string, unknown>,
> = [
    ...([KRepositories] extends [never]
        ? []
        : [repositories: Pick<AppRepositories, KRepositories>]),
    ...([KJobs] extends [never] ? [] : [jobs: Pick<AppJobs, KJobs>]),
    ...([TConfig] extends [never] ? [] : [config: TConfig]),
];

type CreateServiceImpl<
    T,
    KRepositories extends keyof AppRepositories,
    KJobs extends keyof AppJobs = never,
    TConfig extends Record<string, unknown> = never,
> = (...args: ServiceArgs<KRepositories, KJobs, TConfig>) => T;

type CreateService<
    T,
    KRepositories extends keyof AppRepositories,
    KJobs extends keyof AppJobs = never,
    TConfig extends Record<string, unknown> = never,
> = [KRepositories] extends [never]
    ? (...args: ServiceArgs<KRepositories, KJobs, TConfig>) => T
    : (
          transaction: TransactionRunner,
          ...args: ServiceArgs<KRepositories, KJobs, TConfig>
      ) => T;

/**
 * Creates a service factory. Every method returned by the factory is
 * automatically wrapped in a database transaction, so all repository calls
 * within a method share a single transaction. Services that declare no
 * repositories (`KRepositories = never`) are returned unwrapped.
 */
export const createService = <
    T,
    KRepositories extends keyof AppRepositories = never,
    KJobs extends keyof AppJobs = never,
    TConfig extends Record<string, unknown> = never,
>(
    factory: CreateServiceImpl<T, KRepositories, KJobs, TConfig>,
): CreateService<T, KRepositories, KJobs, TConfig> =>
    ((...args: unknown[]) => {
        const transaction = args[0];
        const factoryArgs =
            typeof transaction === "function" ? args.slice(1) : args;
        const impl = (factory as (...a: unknown[]) => T)(...factoryArgs);
        if (typeof transaction !== "function") {
            return impl;
        }
        const wrapped = {} as T;
        for (const key of Object.keys(impl as object) as (keyof T)[]) {
            const fn = impl[key] as (...fnArgs: never[]) => unknown;
            wrapped[key] = ((...fnArgs: never[]) =>
                (transaction as TransactionRunner)(async () =>
                    fn(...fnArgs),
                )) as never;
        }
        return wrapped;
    }) as CreateService<T, KRepositories, KJobs, TConfig>;

type KnownEntities =
    | "attachment"
    | "book"
    | "book member"
    | "book recipe"
    | "cooklist meal"
    | "list item"
    | "list member"
    | "list"
    | "meal"
    | "planner meal"
    | "planner member"
    | "recipe"
    | "recipe rating"
    | "planner"
    | "resource"
    | "user";

export class PermissionError extends AppError {
    constructor(entity: KnownEntities) {
        super({
            status: 403,
            code: "MISSING_PERMISSIONS",
            message: `You do not have permission to access this ${entity}`,
        });
    }
}

export class NotFoundError extends AppError {
    constructor(entity: KnownEntities, entityIds?: string | string[]) {
        super({
            status: 404,
            code: "NOT_FOUND",
            message: `The requested ${entity} entries were not found: ${
                entityIds?.length
                    ? `Ids: ${EnsureArray(entityIds).join(", ")}`
                    : ""
            }`,
        });
    }
}

export class UpdatedDataFetchError extends AppError {
    constructor(entity: KnownEntities, entityIds: string | string[]) {
        super({
            status: 500,
            code: "UPDATE_READ_FAILED",
            message: `The updated ${entity} entries were not found: ${
                entityIds.length
                    ? `Ids: ${EnsureArray(entityIds).join(", ")}`
                    : ""
            }`,
        });
    }
}
export class CreatedDataFetchError extends AppError {
    constructor(entity: KnownEntities) {
        super({
            status: 500,
            code: "CREATE_READ_FAILED",
            message: `The created ${entity} entries were not found`,
        });
    }
}

export class InsufficientDataError extends AppError {
    constructor(entity: KnownEntities) {
        super({
            status: 400,
            code: "INSUFFICIENT_DATA",
            message: `Insufficient data provided to perform the requested operation on this ${entity}`,
        });
    }
}

export class InvalidOperationError extends AppError {
    constructor(entity: KnownEntities, reason?: string) {
        super({
            status: 400,
            code: "INVALID_OPERATION",
            message: `Invalid operation performed on this ${entity}${reason ? ` (${reason})` : ""}`,
        });
    }
}

export class UnknownError extends AppError {
    constructor(innerError: unknown) {
        super({
            status: 500,
            innerError,
        });
    }
}

export class UnauthorizedError extends AppError {
    constructor(reason = "Unauthorised", innerError?: unknown) {
        super({
            status: 401,
            code: "UNAUTHORIZED",
            message: reason,
            innerError,
        });
    }
}
