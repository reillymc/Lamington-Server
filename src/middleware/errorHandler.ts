import type { ErrorRequestHandler } from "express";
import { AppError, logger } from "../utils/logger.ts";
import type { CreateMiddleware, Middleware } from "./middleware.ts";

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
        innerError = error.innerError as Error;
    }

    if (error instanceof Error) {
        message = error.message;
        innerError = error.cause;
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

export const createErrorHandlerMiddleware: CreateMiddleware = () => [
    errorHandler as unknown as Middleware,
];
