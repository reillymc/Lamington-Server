import type { ErrorRequestHandler } from "express";

import { authEndpoint } from "../routes/spec/index.ts";
import { AppError, logger, ValidationError } from "../services/index.ts";

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

    logger.log({
        level: "error",
        message: (error as Error)?.message || "Unknown Error",
        request: {
            params: request.params,
            query: request.query,
            body: request.originalUrl.includes(authEndpoint) ? "REDACTED" : request.body,
            route: request.originalUrl,
            method: request.method,
        },
        stackTrace: {
            message: (innerError as Error)?.message,
            stack: (innerError as Error)?.stack,
        },
    });

    response.status(status);
    return response.json({ error: true, message });
};
