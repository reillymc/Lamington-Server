import { NextFunction, Request, Response } from "express";

import { AppError } from "../services";

export const notFoundMiddleware = (request: Request, response: Response, next: NextFunction) => {
    next(new AppError({ message: "Not Found", userMessage: "The requested resource could not be found" }));
};
