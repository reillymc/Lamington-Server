import type { AppRepositories, Database } from "../repositories/index.ts";
import { EnsureArray } from "../utils/index.ts";
import { AppError } from "../utils/logger.ts";

export type CreateService<
    T,
    KRepositories extends keyof AppRepositories,
    TConfig extends Record<string, unknown> = never,
> = [TConfig] extends [never]
    ? (
          database: Database,
          repositories: Pick<AppRepositories, KRepositories>,
      ) => T
    : (
          database: Database,
          repositories: Pick<AppRepositories, KRepositories>,
          config: TConfig,
      ) => T;

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
    constructor(reason?: string, innerError?: unknown) {
        super({
            status: 401,
            code: "UNAUTHORIZED",
            message: reason,
            innerError,
        });
    }
}
