import type { ErrorRequestHandler } from "express";

import { authEndpoint } from "../routes/spec/index.ts";
import { AppError, logger } from "../services/index.ts";

export const errorMiddleware: ErrorRequestHandler = (error: AppError, request, response) => {
    logger.log({
        level: "error",
        message: error.message,
        request: {
            params: request.params,
            query: request.query,
            body: request.originalUrl.includes(authEndpoint) ? "REDACTED" : request.body,
            route: request.originalUrl,
            method: request.method,
        },
        stackTrace: {
            message: (error.innerError as Error)?.message,
            stack: (error.innerError as Error)?.stack,
        },
    });

    response.status(error.status || 500);
    return response.json({ error: true, message: error.message });
};
