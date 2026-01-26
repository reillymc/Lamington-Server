import type { RateLimiter } from "./rateLimiters.ts";

export * from "./attachment.ts";
export * from "./authentication.ts";
export * from "./error.ts";
export { loggerMiddleware } from "./logger.ts";
export * from "./notFound.ts";

export type AppMiddleware = {
    rateLimiterLoose: RateLimiter;
    rateLimiterControlled: RateLimiter;
    rateLimiterRestrictive: RateLimiter;
};
