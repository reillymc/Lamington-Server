import type { ErrorRequestHandler } from "express";
import { type FieldError, ValidationError } from "../utils/errors.ts";
import { AppError, type Logger } from "../utils/logger.ts";
import type { CreateMiddleware, Middleware } from "./middleware.ts";

type CreateErrorHandlerMiddlewareConfig = {
    logger: Logger;
};

export const createErrorHandlerMiddleware: CreateMiddleware<
    CreateErrorHandlerMiddlewareConfig
> = ({ logger }) => {
    const errorHandler: ErrorRequestHandler = (
        error: unknown,
        request,
        response,
        _next,
    ) => {
        let status = 500;
        let code: string | undefined;
        let message = "Internal Server Error";
        let innerError: unknown;
        let fieldErrors: FieldError[] | undefined;

        if (error instanceof AppError) {
            status = error.status;
            code = error.code;
            message = error.message;
            innerError = error.innerError;

            if (error instanceof ValidationError) {
                fieldErrors = error.fieldErrors;
            }
        } else if (error instanceof Error) {
            innerError = error;

            if (!(error instanceof AppError)) {
                // Framework errors (body-parser, http-errors, express-openapi-validator
                // HttpError) carry their status on `status`/`statusCode` instead of
                // being AppErrors. Without this, oversized payloads surface as 500.
                const errorWithStatus = error as
                    | {
                          status?: unknown;
                          statusCode?: unknown;
                      }
                    | undefined;
                if (typeof errorWithStatus?.status === "number") {
                    status = errorWithStatus.status;
                } else if (typeof errorWithStatus?.statusCode === "number") {
                    status = errorWithStatus.statusCode;
                }
            }
        }

        logger.log({
            level: "error",
            message: message || "Unknown Error",
            request: {
                params: request.params,
                query: request.query,
                body: request.originalUrl.includes("/auth")
                    ? "REDACTED"
                    : request.body, // TODO more robust solution
                route: request.originalUrl,
                method: request.method,
            },
            stackTrace: {
                message: (innerError as Error)?.message,
                stack: (innerError as Error)?.stack,
            },
        });

        const hasFieldErrors = !!fieldErrors && fieldErrors.length > 0;

        return response.status(status).json({
            error: true,
            ...(code ? { code } : {}),
            message: hasFieldErrors ? "Some fields are not valid" : message,
            ...(hasFieldErrors ? { fieldErrors } : {}),
        });
    };

    return [errorHandler as unknown as Middleware];
};
