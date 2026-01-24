import type { RequestHandler } from "express";
import { setupApp } from "../../src/app.ts";
import {
    DefaultAppDependencies,
    MergeAppDependencies,
    type PartialAppDependencies,
} from "../../src/appDependencies.ts";
import db from "../../src/database/index.ts";

const dummyRequestHandler: RequestHandler = (_req, _res, next) => {
    next();
};

export const createTestApp = async (dependencies?: PartialAppDependencies) => {
    const database = await db.transaction();
    return [
        setupApp(
            MergeAppDependencies(
                MergeAppDependencies(DefaultAppDependencies(database), {
                    database,
                    limiters: {
                        auth: dummyRequestHandler,
                        general: dummyRequestHandler,
                    },
                }),
                dependencies,
            ),
        ),
        database,
    ] as const;
};
