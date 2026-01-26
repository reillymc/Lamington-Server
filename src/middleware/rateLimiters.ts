import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";

// biome-ignore lint/suspicious/noExplicitAny: any is needed to pass through openapi validated route types
export type RateLimiter = RequestHandler<any, any, any, any>;

export const createRateLimiterLoose = (): RateLimiter[] => [
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 100,
        standardHeaders: true,
        legacyHeaders: false,
        ipv6Subnet: 56,
    }),
];

export const createRateLimiterControlled = (): RateLimiter[] => [
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 20,
        standardHeaders: true,
        legacyHeaders: false,
        ipv6Subnet: 56,
    }),
];

export const createRateLimiterRestrictive = (): RateLimiter[] => [
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 5,
        standardHeaders: true,
        legacyHeaders: false,
        ipv6Subnet: 56,
    }),
];
