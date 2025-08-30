import type { RequestHandler } from "express";

import { AppError } from "../services/index.ts";

export const notFoundMiddleware: RequestHandler = (request, response, next) => {
    next(new AppError({ message: "The requested resource could not be found" }));
};
