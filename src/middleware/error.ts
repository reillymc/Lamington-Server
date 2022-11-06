import { NextFunction, Request, Response } from "express";

import { AppError, logger } from "../services";

export const errorMiddleware = (error: AppError, request: Request, response: Response, next: NextFunction) => {
    logger.log({
        level: "error",
        message: error.message,
        request: {
            params: request.params,
            query: request.query,
            body: request.body,
            route: request.originalUrl,
        },
    });

    response.status(error.status || 500);
    return response.json({ error: true, message: error.userMessage });
};
