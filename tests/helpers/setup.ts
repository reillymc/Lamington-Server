import type { RequestHandler } from "express";
import { type AppParams, setupApp } from "../../src/app.ts";

const dummyRequestHandler: RequestHandler[] = [
    (_req, _res, next) => {
        next();
    },
];

export const createTestApp = ({
    database,
    repositories,
    services,
    middleware,
}: AppParams) =>
    setupApp({
        database,
        repositories,
        services,
        middleware: {
            // By default override rate limiters to avoid general tests getting rate limited
            rateLimiterControlled: dummyRequestHandler,
            rateLimiterLoose: dummyRequestHandler,
            rateLimiterRestrictive: dummyRequestHandler,
            ...middleware,
        },
    });
