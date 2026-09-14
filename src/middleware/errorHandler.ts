import type { ErrorRequestHandler } from "express";
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
        let message = "Internal Server Error";
        let innerError: unknown;

        if (error instanceof AppError) {
            status = error.status;
            message = error.message;
            innerError = error.innerError;
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

        return response.status(status).json({ error: true, message });
    };

    return [errorHandler as unknown as Middleware];
};
