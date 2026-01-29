import { createLogger, format, transports } from "winston";
import "winston-daily-rotate-file";

import { EnsureArray, Undefined } from "../utils/index.ts";

const logPath = "logs";

export interface AppErrorConstructor {
    status?: number;
    code?: string;
    message?: string;
    innerError?: unknown;
}
export class AppError {
    status: number;
    code: string;
    message: string;
    innerError: unknown;
    constructor({
        status = 500,
        code = "LAMINGTON_ERROR",
        message = "An unknown error occurred",
        innerError,
    }: AppErrorConstructor) {
        this.status = status;
        this.code = code;
        this.message = message;
        this.innerError = innerError;
    }
}

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

export class UnauthorizedError extends AppError {
    constructor(reason?: string) {
        super({
            status: 401,
            code: "UNAUTHORIZED",
            message: reason,
        });
    }
}

export class ValidationError extends AppError {
    constructor(innerError: any) {
        super({
            status: innerError.status,
            message: innerError.message,
            innerError,
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

const ErrorLogFileTransport = new transports.DailyRotateFile({
    level: "error",
    filename: "error-%DATE%.log",
    zippedArchive: true,
    maxSize: "10m",
    maxFiles: "60d",
    dirname: logPath,
    format: format.combine(
        format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json(),
    ),
});

const AccessLogFileTransport = new transports.DailyRotateFile({
    level: "http",
    filename: "access-%DATE%.log",
    zippedArchive: true,
    maxSize: "10m",
    maxFiles: "60d",
    dirname: logPath,
    format: format.combine(
        format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.printf(({ level, message, timestamp }) => {
            return `${timestamp} ${level}: ${message}`;
        }),
    ),
});

const ConsoleLogTransport =
    process.env.NODE_ENV === "development"
        ? new transports.Console({
              level: "http",
              format: format.combine(format.colorize(), format.simple()),
          })
        : undefined;

export const logger = createLogger({
    transports: [
        ErrorLogFileTransport,
        AccessLogFileTransport,
        ConsoleLogTransport,
    ].filter(Undefined),
});

export const MessageAction = {
    Create: "creating",
    Query: "querying",
    Read: "reading",
    Update: "updating",
    Delete: "deleting",
    Save: "saving",
} as const;

export type MessageAction = typeof MessageAction;

interface UserMessage {
    entity: string;
    subEntity?: string;
    action: MessageAction | string;
}

export const userMessage = ({ action, entity, subEntity }: UserMessage) =>
    `An error occurred when ${action} your ${entity}${subEntity ? ` ${subEntity}` : ""}`;
