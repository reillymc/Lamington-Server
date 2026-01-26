import type { RequestHandler } from "express";
import { type AppParams, setupApp } from "../../src/app.ts";
import db from "../../src/database/index.ts";

const dummyRequestHandler: RequestHandler[] = [
    (_req, _res, next) => {
        next();
    },
];

export const createTestApp = async ({
    repositories,
    services,
    middleware,
}: Omit<AppParams, "database"> = {}) => {
    const database = await db.transaction();
    return [
        setupApp({
            database,
            repositories,
            services,
            middleware: {
                rateLimiterControlled: dummyRequestHandler,
                rateLimiterLoose: dummyRequestHandler,
                rateLimiterRestrictive: dummyRequestHandler,
                ...middleware,
            },
        }),
        database,
    ] as const;
};
