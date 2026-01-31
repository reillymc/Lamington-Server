import cors from "cors";
import express from "express";
import helmet from "helmet";

import {
    DefaultAppServices,
    type PartialAppDependencies,
} from "./appDependencies.ts";
import type { Database } from "./database/index.ts";
import type { AppRepositories } from "./repositories/index.ts";
import { createAppRouter } from "./routes/index.ts";

interface AppParams {
    database?: Database;
    services?: PartialAppDependencies;
    repositories?: Partial<AppRepositories>;
}

export const setupApp = ({ database, repositories, services }: AppParams) =>
    express()
        .use(express.json())
        .use(express.urlencoded({ extended: false }))
        .use(cors())
        .use(
            helmet({
                contentSecurityPolicy: {
                    directives: { defaultSrc: ["'self'"] },
                },
            }),
        )
        .use(
            createAppRouter({
                ...DefaultAppServices(database, repositories),
                ...services,
            }),
        );
