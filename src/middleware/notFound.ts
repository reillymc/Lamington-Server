import { NotFoundError } from "../services/index.ts";
import type { CreateMiddleware } from "./middleware.ts";

export const createNotFoundMiddleware: CreateMiddleware = () => [
    (_request, _response, next) => {
        next(new NotFoundError("resource"));
    },
];
