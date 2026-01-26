import type { RateLimiter } from "./rateLimiters.ts";
import type { Validator } from "./validator.ts";

export * from "./error.ts";
export { loggerMiddleware } from "./logger.ts";
export * from "./notFound.ts";

export type AppMiddleware = {
    rateLimiterLoose: RateLimiter[];
    rateLimiterControlled: RateLimiter[];
    rateLimiterRestrictive: RateLimiter[];
    validator: Validator[];
};
