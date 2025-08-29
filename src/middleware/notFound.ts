import type { NextFunction, Request, Response } from "express";

import { AppError } from "../services/index.ts";

export const notFoundMiddleware = (request: Request, response: Response, next: NextFunction) => {
    next(new AppError({ message: "The requested resource could not be found" }));
};
