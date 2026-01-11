import type { RequestHandler } from "express";

import { NotFoundError } from "../services/index.ts";

export const notFoundMiddleware: RequestHandler = (request, response, next) => {
    next(new NotFoundError("resource"));
};
