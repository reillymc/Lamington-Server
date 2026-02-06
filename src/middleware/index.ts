import type { Middleware } from "./middleware.ts";

export type AppMiddleware = {
    rateLimiterLoose: Middleware[];
    rateLimiterControlled: Middleware[];
    rateLimiterRestrictive: Middleware[];
    validator: Middleware[];
    errorHandler: Middleware[];
    logger: Middleware[];
    notFound: Middleware[];
};
