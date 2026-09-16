import { EnsureArray } from "@reillymc/es-utils";
import type { AppJobs } from "../jobs/index.ts";
import type { AppRepositories, Database } from "../repositories/index.ts";
import { AppError } from "../utils/logger.ts";

export type CreateService<
    T,
    KRepositories extends keyof AppRepositories,
    KJobs extends keyof AppJobs = never,
    TConfig extends Record<string, unknown> = never,
> = [KJobs] extends [never]
    ? [TConfig] extends [never]
        ? (
              database: Database,
              repositories: Pick<AppRepositories, KRepositories>,
          ) => T
        : (
              database: Database,
              repositories: Pick<AppRepositories, KRepositories>,
              config: TConfig,
          ) => T
    : [TConfig] extends [never]
      ? (
            database: Database,
            repositories: Pick<AppRepositories, KRepositories>,
            jobs: Pick<AppJobs, KJobs>,
        ) => T
      : (
            database: Database,
            repositories: Pick<AppRepositories, KRepositories>,
            jobs: Pick<AppJobs, KJobs>,
            config: TConfig,
        ) => T;

export class ServiceError extends AppError {
    protected static formatEntityIds(
        entityIds?: string | readonly string[],
    ): string {
        return entityIds?.length
            ? `Ids: ${EnsureArray(entityIds).join(", ")}`
            : "";
    }
}

export class PermissionError extends ServiceError {
    constructor(entity: string) {
        super({
            status: 403,
            code: "MISSING_PERMISSIONS",
            message: `You do not have permission to access this ${entity}`,
        });
    }
}

export class NotFoundError extends ServiceError {
    constructor(entity: string, entityIds?: string | readonly string[]) {
        super({
            status: 404,
            code: "NOT_FOUND",
            message: `The requested ${entity} entries were not found: ${ServiceError.formatEntityIds(
                entityIds,
            )}`,
        });
    }
}

export class UpdatedDataFetchError extends ServiceError {
    constructor(entity: string, entityIds: string | readonly string[]) {
        super({
            status: 500,
            code: "UPDATE_READ_FAILED",
            message: `The updated ${entity} entries were not found: ${ServiceError.formatEntityIds(
                entityIds,
            )}`,
        });
    }
}

export class CreatedDataFetchError extends ServiceError {
    constructor(entity: string) {
        super({
            status: 500,
            code: "CREATE_READ_FAILED",
            message: `The created ${entity} entries were not found`,
        });
    }
}

export class InsufficientDataError extends ServiceError {
    constructor(entity: string) {
        super({
            status: 400,
            code: "INSUFFICIENT_DATA",
            message: `Insufficient data provided to perform the requested operation on this ${entity}`,
        });
    }
}

export class InvalidOperationError extends ServiceError {
    constructor(entity: string, reason?: string) {
        super({
            status: 400,
            code: "INVALID_OPERATION",
            message: `Invalid operation performed on this ${entity}${reason ? ` (${reason})` : ""}`,
        });
    }
}

export class UnknownError extends ServiceError {
    constructor(innerError: unknown) {
        super({
            status: 500,
            innerError,
        });
    }
}
