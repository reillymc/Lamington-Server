import type { RequestHandler } from "express";
import { AppError } from "../utils/logger.ts";

// biome-ignore lint/suspicious/noExplicitAny: any is needed to pass through openapi validated route types
export type Middleware = RequestHandler<any, any, any, any>;

export type CreateMiddleware<TConfig extends Record<string, unknown> = never> =
    [TConfig] extends [never]
        ? () => Middleware[]
        : (config: TConfig) => Middleware[];

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

export class ValidationError extends AppError {
    constructor(innerError: unknown) {
        const innerErrorObject =
            innerError !== null && typeof innerError === "object"
                ? innerError
                : undefined;

        const innerErrorStatus =
            innerErrorObject &&
            "status" in innerErrorObject &&
            typeof innerErrorObject.status === "number"
                ? innerErrorObject.status
                : undefined;

        const innerErrorString =
            innerErrorObject &&
            "message" in innerErrorObject &&
            typeof innerErrorObject.message === "string"
                ? innerErrorObject.message
                : undefined;

        super({
            status: innerErrorStatus ?? 500,
            message: innerErrorString ?? "An unknown validation error occurred",
            innerError,
        });
    }
}
