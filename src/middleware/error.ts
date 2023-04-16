import { NextFunction, Request, Response } from "express";

import { AppError, logger } from "../services";
import { authEndpoint } from "../routes/spec";

export const errorMiddleware = (error: AppError, request: Request, response: Response, next: NextFunction) => {
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
