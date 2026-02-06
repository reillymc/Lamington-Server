import rateLimit from "express-rate-limit";
import type { CreateMiddleware } from "./middleware.ts";

export const createRateLimiterLoose: CreateMiddleware = () => [
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 100,
        standardHeaders: true,
        legacyHeaders: false,
        ipv6Subnet: 56,
    }),
];

export const createRateLimiterControlled: CreateMiddleware = () => [
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 20,
        standardHeaders: true,
        legacyHeaders: false,
        ipv6Subnet: 56,
    }),
];

export const createRateLimiterRestrictive: CreateMiddleware = () => [
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 5,
        standardHeaders: true,
        legacyHeaders: false,
        ipv6Subnet: 56,
    }),
];
