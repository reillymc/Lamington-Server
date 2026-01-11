import type { ErrorRequestHandler } from "express";

import { AppError, logger, UnauthorizedError, ValidationError } from "../services/index.ts";

export const errorMiddleware: ErrorRequestHandler = (error: unknown, request, response, _next) => {
    let status = 500;
    let message = "Internal Server Error";
    let innerError: unknown;

    if (error instanceof AppError) {
        status = error.status;
        message = error.message;
        innerError = error.innerError as Error;
    }

    if (error instanceof ValidationError) {
        status = error.status;
        message = error.message;
        innerError = error.innerError;
    }

    if (error instanceof UnauthorizedError) {
        status = error.status;
        message = error.message;
        innerError = error.innerError;
    }

    logger.log({
        level: "error",
        message: (error as Error)?.message || "Unknown Error",
        request: {
            params: request.params,
            query: request.query,
            body: request.originalUrl.includes("/auth") ? "REDACTED" : request.body, // TODO more robust solution
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
